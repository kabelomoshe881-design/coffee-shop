import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * File-backed driver used for local development when no Redis URL is present.
 *
 * It implements the same interface as the Redis driver so the rest of the
 * application is identical in both modes. Data is persisted to a JSON file on
 * every write, which is enough to demonstrate "changes survive a restart"
 * without installing Redis. Production should use the Redis driver.
 */
export async function createFileStore(filePath) {
  const empty = () => ({ strings: {}, sets: {}, zsets: {}, hashes: {} });

  let state = empty();
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    state = { ...empty(), ...JSON.parse(raw) };
  } catch {
    // First run: no file yet.
  }

  let queue = Promise.resolve();

  function persist() {
    queue = queue
      .then(async () => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        const tmp = `${filePath}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(state, null, 2));
        await fs.rename(tmp, filePath);
      })
      .catch((err) => console.error('[file-store] persist failed:', err.message));
    return queue;
  }

  const setOf = (key) => (state.sets[key] ||= []);
  const zsetOf = (key) => (state.zsets[key] ||= {});

  return {
    driver: 'file',

    async ping() {
      return true;
    },

    async get(key) {
      return state.strings[key] ?? null;
    },

    async set(key, value) {
      state.strings[key] = value;
      await persist();
    },

    async del(key) {
      delete state.strings[key];
      delete state.sets[key];
      delete state.zsets[key];
      delete state.hashes[key];
      await persist();
    },

    async sAdd(key, ...members) {
      const set = setOf(key);
      for (const m of members) if (!set.includes(m)) set.push(m);
      await persist();
    },

    async sRem(key, ...members) {
      state.sets[key] = setOf(key).filter((m) => !members.includes(m));
      await persist();
    },

    async sMembers(key) {
      return [...setOf(key)];
    },

    async zAdd(key, score, member) {
      zsetOf(key)[member] = Number(score);
      await persist();
    },

    async zRem(key, member) {
      delete zsetOf(key)[member];
      await persist();
    },

    async zRange(key, { rev = false } = {}) {
      const entries = Object.entries(zsetOf(key));
      entries.sort((a, b) => a[1] - b[1]);
      if (rev) entries.reverse();
      return entries.map(([member]) => member);
    },

    async hSet(key, obj) {
      const hash = (state.hashes[key] ||= {});
      for (const [field, value] of Object.entries(obj)) hash[field] = String(value);
      await persist();
    },

    async hGetAll(key) {
      return { ...(state.hashes[key] || {}) };
    },

    async hIncrBy(key, field, amount) {
      const hash = (state.hashes[key] ||= {});
      hash[field] = String(Number(hash[field] || 0) + amount);
      await persist();
      return Number(hash[field]);
    },

    async incr(key) {
      const next = Number(state.strings[key] || 0) + 1;
      state.strings[key] = next;
      await persist();
      return next;
    },

    async multi(ops) {
      const results = [];
      for (const [command, ...args] of ops) {
        switch (command) {
          case 'set':
            state.strings[args[0]] = args[1];
            break;
          case 'del':
            delete state.strings[args[0]];
            break;
          case 'sadd':
            setOf(args[0]);
            for (const m of args.slice(1)) if (!setOf(args[0]).includes(m)) setOf(args[0]).push(m);
            break;
          case 'srem':
            state.sets[args[0]] = setOf(args[0]).filter((m) => !args.slice(1).includes(m));
            break;
          case 'zadd':
            zsetOf(args[0])[args[2]] = Number(args[1]);
            break;
          case 'zrem':
            delete zsetOf(args[0])[args[1]];
            break;
          case 'hset': {
            const hash = (state.hashes[args[0]] ||= {});
            for (let i = 1; i < args.length; i += 2) hash[args[i]] = String(args[i + 1]);
            break;
          }
          case 'hincrby': {
            const hash = (state.hashes[args[0]] ||= {});
            hash[args[1]] = String(Number(hash[args[1]] || 0) + Number(args[2]));
            break;
          }
          case 'incr':
            state.strings[args[0]] = Number(state.strings[args[0]] || 0) + 1;
            results.push(state.strings[args[0]]);
            break;
          default:
            throw new Error(`file-store: unsupported command "${command}"`);
        }
      }
      await persist();
      return results;
    },

    async close() {
      await queue;
    },
  };
}
