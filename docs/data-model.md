# Data model

The assignment requires a **key-value NoSQL** store: every record is a unique key and a JSON
document value. There is no query language, no joins and no secondary indexes for free. This
document explains the key layout and the reasoning behind it.

Two drivers implement the same interface:

| Driver | When | Where |
| --- | --- | --- |
| `redis` | `REDIS_URL` is set, or `STORE_DRIVER=redis` | `server/src/store/redis.js` |
| `file` | Default with no configuration | `server/src/store/file.js` → `server/data/db.json` |

Repositories only ever call the interface, never a driver directly, so application code is
identical in both modes.

---

## Keys

```
menu:item:{id}           STRING   JSON menu item
menu:index               SET      every menu item id
menu:category:{category} SET      menu item ids in that category

order:{id}               STRING   JSON order document
orders:index             ZSET     order ids scored by created-at (ms)
orders:status:{status}   SET      order ids in that status
orders:day:{YYYY-MM-DD}  SET      order ids created that day
stats:day:{YYYY-MM-DD}   HASH     { orderCount, revenueCents }
counter:order            STRING   integer, INCR source for ORD-0001
```

Everything the app needs to list, filter or total is reachable from one of these indexes. There
is no `KEYS *` or `SCAN` anywhere in the codebase — both are O(n) over the whole database and
would be the first thing to fall over as orders accumulate.

---

## Documents

### Menu item

```json
{
  "id": "6f1c1b6e-2b1a-4b8e-9a55-3f0c2a9d1e77",
  "name": "Flat White",
  "description": "Ristretto shots with silky micro-foam.",
  "priceCents": 3400,
  "category": "coffee",
  "available": true,
  "createdAt": "2026-11-01T07:02:11.000Z",
  "updatedAt": "2026-11-01T07:02:11.000Z"
}
```

### Order

```json
{
  "id": "9c2f0a1e-77b4-4c31-8f5a-0d2b7e9c4a10",
  "orderNumber": "ORD-0007",
  "customerName": "Thabo Mokoena",
  "note": "Oat milk, extra hot",
  "items": [
    {
      "itemId": "6f1c1b6e-2b1a-4b8e-9a55-3f0c2a9d1e77",
      "name": "Flat White",
      "priceCents": 3400,
      "qty": 2,
      "lineTotalCents": 6800
    }
  ],
  "totalCents": 6800,
  "status": "pending",
  "createdAt": "2026-11-10T09:14:22.000Z",
  "updatedAt": "2026-11-10T09:14:22.000Z"
}
```

An order line deliberately duplicates `name` and `priceCents` from the menu item.

---

## Three decisions that matter

### 1. Prices are snapshotted onto the line

If a flat white goes from R34 to R38 next week, the receipt for ORD-0007 must still read R34.
Denormalising `name` and `priceCents` into the line is not a mistake here — it is the point.
A receipt is a historical fact, not a live view.

It also means deleting a menu item never breaks an old order.

### 2. Money is an integer

`priceCents: 3400`, never `34.00`. Floating point cannot represent `0.1` exactly, and adding
prices in floats produces totals like `89.99999999999999`. All arithmetic happens in integer
cents and is divided by 100 only at the display layer.

### 3. Multi-key writes are atomic

Creating an order touches six keys:

```
SET     order:{id}
ZADD    orders:index
SADD    orders:status:pending
SADD    orders:day:{date}
HINCRBY stats:day:{date} orderCount 1
HINCRBY stats:day:{date} revenueCents {total}
```

They run inside one `MULTI`/`EXEC`, so an order can never exist without its indexes, and the
daily totals can never drift from the orders they summarise. Status changes are the same: the
document, the old status set and the new status set move together.

---

## How each read is served

| Need | Path |
| --- | --- |
| Full menu | `SMEMBERS menu:index` → `GET` each |
| Menu by category | `SMEMBERS menu:category:coffee` |
| One menu item | `GET menu:item:{id}` |
| All orders, newest first | `ZRANGE orders:index REV` |
| Orders by status | `SMEMBERS orders:status:preparing` |
| Orders for a day | `SMEMBERS orders:day:2026-11-10` |
| Daily totals | `HGETALL stats:day:2026-11-10` |
| Next order number | `INCR counter:order` |

The two order filters are not composable in one lookup (`status` **and** `date` would need a
third index). The API accepts one or the other, which is enough for the dashboard: the board
groups by status, the daily summary groups by day.

---

## Workflow enforcement

```
pending ──▶ preparing ──▶ ready ──▶ collected
```

`TRANSITIONS` in `server/src/repositories/orders.js` is the only place this is defined. The
route validates that the value is a real status; the repository validates that the *move* is
legal. Attempting `pending → collected` returns `409` with the allowed next step.

Enforcing this server-side rather than in React means the rule holds for curl, for a stale
browser tab and for any future client.

---

## Growth and limits

| Concern | At assignment scale | At production scale |
| --- | --- | --- |
| `orders:index` holds every order | Fine, thousands of ids | Archive per month into `orders:month:{YYYY-MM}` |
| Menu listing does N+1 `GET`s | 16 items, one round trip each | Pipeline the `GET`s, or cache the whole menu under one key |
| File driver is single-process | Fine for one `npm run dev` | Use Redis — the file driver is not safe across processes |
| No TTL on anything | Fine | Expire `stats:day:*` after a year, keep orders |

None of these are hidden; they are listed in the README's known limitations.
