import Redis from 'ioredis';

/**
 * Redis driver.
 *
 * Every method mirrors the small interface used by the repositories so the
 * application never depends on Redis specifics. Values are stored as JSON
 * strings, which is exactly how the assignment describes a key-value store:
 * a unique key and a JSON document as the value.
 */
export function createRedisStore(url) {
  const redis = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });

  redis.on('error', (err) => console.error('[redis]', err.message));

  return {
    driver: 'redis',

    async ping() {
      return (await redis.ping()) === 'PONG';
    },

    async get(key) {
      const raw = await redis.get(key);
      return raw == null ? null : JSON.parse(raw);
    },

    async set(key, value) {
      await redis.set(key, JSON.stringify(value));
    },

    async del(key) {
      await redis.del(key);
    },

    async sAdd(key, ...members) {
      if (members.length) await redis.sadd(key, ...members);
    },

    async sRem(key, ...members) {
      if (members.length) await redis.srem(key, ...members);
    },

    async sMembers(key) {
      return redis.smembers(key);
    },

    async zAdd(key, score, member) {
      await redis.zadd(key, score, member);
    },

    async zRem(key, member) {
      await redis.zrem(key, member);
    },

    async zRange(key, { rev = false } = {}) {
      return rev ? redis.zrange(key, 0, -1, 'REV') : redis.zrange(key, 0, -1);
    },

    async hSet(key, obj) {
      const entries = Object.entries(obj).flatMap(([field, value]) => [field, String(value)]);
      if (entries.length) await redis.hset(key, entries);
    },

    async hGetAll(key) {
      return redis.hgetall(key);
    },

    async hIncrBy(key, field, amount) {
      return Number(await redis.hincrby(key, field, amount));
    },

    async incr(key) {
      return Number(await redis.incr(key));
    },

    /** Atomic multi-key write. ops are [command, ...args] tuples. */
    async multi(ops) {
      const tx = redis.multi();
      for (const [command, ...args] of ops) {
        if (command === 'set') tx.set(args[0], JSON.stringify(args[1]));
        else tx[command](...args);
      }
      return tx.exec();
    },

    async close() {
      await redis.quit().catch(() => {});
    },
  };
}
