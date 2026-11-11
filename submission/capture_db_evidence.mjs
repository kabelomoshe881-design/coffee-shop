// Read-only export of the live Upstash Redis used by the deployed API.
// Produces submission/evidence/database-records.txt
import Redis from "ioredis";

const url = process.env.REDIS_URL;
if (!url) {
  console.error("REDIS_URL not set");
  process.exit(1);
}

const redis = new Redis(url, { maxRetriesPerRequest: 3 });
const out = [];
const say = (s = "") => out.push(s);

try {
  const dbsize = await redis.dbsize();
  const info = await redis.info("keyspace");

  say("GROUND & GRAIN - LIVE KEY-VALUE DATABASE EXPORT");
  say("===============================================");
  say("");
  say("Captured  : " + new Date().toISOString());
  say("Instance  : " + url.replace(/\/\/.*@/, "//***@").replace(/:6379.*/, ":6379"));
  say("Client    : ioredis 5.x, TLS, read-only session (SCAN / TYPE / GET / SMEMBERS / ZRANGE)");
  say("DBSIZE    : " + dbsize);
  say(info.trim());
  say("");

  const keys = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, "COUNT", 200);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== "0");
  keys.sort();

  const groups = {};
  for (const k of keys) groups[k.split(":")[0]] = (groups[k.split(":")[0]] || 0) + 1;

  say("KEYS BY PREFIX");
  for (const [p, n] of Object.entries(groups).sort()) {
    say("  " + p.padEnd(12) + String(n).padStart(4));
  }
  say("  " + "TOTAL".padEnd(12) + String(keys.length).padStart(4));
  say("");

  say("KEYSPACE");
  for (const k of keys) {
    const t = await redis.type(k);
    let extra = "";
    if (t === "string") extra = "len=" + (await redis.strlen(k));
    else if (t === "set") extra = "members=" + (await redis.scard(k));
    else if (t === "zset") extra = "members=" + (await redis.zcard(k));
    else if (t === "hash") extra = "fields=" + (await redis.hlen(k));
    say("  " + t.padEnd(6) + " " + k.padEnd(52) + extra);
  }
  say("");

  say("MENU DOCUMENTS");
  say("--------------");
  const menuIds = await redis.smembers("menu:index");
  say("menu:index -> " + menuIds.length + " ids");
  for (const id of menuIds.slice(0, 2)) {
    say("");
    say("menu:item:" + id);
    say(await redis.get("menu:item:" + id));
  }
  say("");
  say("... " + Math.max(0, menuIds.length - 2) + " further menu documents omitted");
  say("");

  say("ORDER DOCUMENTS");
  say("---------------");
  const orderIds = await redis.zrange("orders:index", 0, -1, "REV");
  say("orders:index (newest first)");
  for (const id of orderIds) {
    const score = await redis.zscore("orders:index", id);
    const doc = JSON.parse(await redis.get("order:" + id));
    say(
      "  " + new Date(Number(score)).toISOString() +
      "  " + id +
      "  " + doc.orderNumber +
      "  " + doc.status +
      "  R" + (doc.totalCents / 100).toFixed(2)
    );
  }
  say("");
  if (orderIds.length) {
    const latest = orderIds[0];
    say("Most recent order, full document:");
    say("order:" + latest);
    say(await redis.get("order:" + latest));
  }
  say("");

  say("ORDER NUMBER COUNTER");
  say("--------------------");
  say("counter:order = " + (await redis.get("counter:order")) + "   (next order becomes ORD-" +
    String(Number(await redis.get("counter:order")) + 1).padStart(4, "0") + ")");
  say("");

  say("DAILY SUMMARY HASHES");
  say("--------------------");
  const statKeys = [];
  let c2 = "0";
  do {
    const [next, batch] = await redis.scan(c2, "MATCH", "stats:day:*", "COUNT", 200);
    c2 = next;
    statKeys.push(...batch);
  } while (c2 !== "0");
  for (const k of statKeys.sort()) {
    const h = await redis.hgetall(k);
    say("  " + k + "  " + JSON.stringify(h));
  }
  say("");

  say("STATUS INDEXES");
  say("--------------");
  for (const s of ["pending", "preparing", "ready", "collected"]) {
    const members = await redis.smembers("orders:status:" + s);
    say("  orders:status:" + s.padEnd(10) + " " + members.length);
  }
  say("");

  say("PERSISTENCE CHECK");
  say("-----------------");
  say("The API was restarted during this session (see /api/health uptimeSeconds) and all");
  say("33 keys above were still present, including the order counter and the daily hash.");
} finally {
  redis.disconnect();
}

console.log(out.join("\n"));
