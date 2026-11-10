import { randomUUID } from 'node:crypto';
import { AppError } from '../middleware/errors.js';

export const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'collected'];

/** Forward-only workflow. Going backwards is rejected with 409. */
export const TRANSITIONS = {
  pending: ['preparing'],
  preparing: ['ready'],
  ready: ['collected'],
  collected: [],
};

const ORDERS_INDEX = 'orders:index';
const COUNTER_KEY = 'counter:order';

const orderKey = (id) => `order:${id}`;
const statusKey = (status) => `orders:status:${status}`;
const dayKey = (day) => `orders:day:${day}`;
const statsKey = (day) => `stats:day:${day}`;

const today = () => new Date().toISOString().slice(0, 10);

export function createOrderRepository(store, menu) {
  return {
    async create({ customerName, note, items }) {
      // Collapse duplicate lines so the same item cannot be sent twice.
      const quantities = new Map();
      for (const line of items) {
        quantities.set(line.itemId, (quantities.get(line.itemId) || 0) + line.qty);
      }

      const lines = [];
      for (const [itemId, qty] of quantities) {
        const item = await menu.get(itemId);
        if (!item) {
          throw new AppError(400, 'INVALID_ITEM', `Menu item ${itemId} does not exist`);
        }
        if (!item.available) {
          throw new AppError(409, 'ITEM_UNAVAILABLE', `${item.name} is not available right now`);
        }
        lines.push({
          itemId: item.id,
          name: item.name,
          // Price is snapshotted: later menu price changes must not rewrite history.
          priceCents: item.priceCents,
          qty,
          lineTotalCents: item.priceCents * qty,
        });
      }

      const totalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
      const sequence = await store.incr(COUNTER_KEY);
      const now = new Date().toISOString();
      const day = now.slice(0, 10);

      const order = {
        id: randomUUID(),
        orderNumber: `ORD-${String(sequence).padStart(4, '0')}`,
        customerName,
        note: note || '',
        items: lines,
        totalCents,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };

      // One atomic write so an order can never exist without its indexes.
      await store.multi([
        ['set', orderKey(order.id), order],
        ['zadd', ORDERS_INDEX, Date.now(), order.id],
        ['sadd', statusKey('pending'), order.id],
        ['sadd', dayKey(day), order.id],
        ['hincrby', statsKey(day), 'orderCount', 1],
        ['hincrby', statsKey(day), 'revenueCents', totalCents],
      ]);

      return order;
    },

    async list({ status, date } = {}) {
      let ids;
      if (status) ids = await store.sMembers(statusKey(status));
      else if (date) ids = await store.sMembers(dayKey(date));
      else ids = await store.zRange(ORDERS_INDEX, { rev: true });

      const orders = (await Promise.all(ids.map((id) => store.get(orderKey(id))))).filter(Boolean);
      return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    async get(id) {
      return store.get(orderKey(id));
    },

    async updateStatus(id, nextStatus) {
      const order = await store.get(orderKey(id));
      if (!order) return null;
      if (order.status === nextStatus) return order;

      if (!TRANSITIONS[order.status].includes(nextStatus)) {
        throw new AppError(
          409,
          'INVALID_TRANSITION',
          `Cannot move an order from "${order.status}" to "${nextStatus}"`,
          { allowed: TRANSITIONS[order.status] }
        );
      }

      const updated = { ...order, status: nextStatus, updatedAt: new Date().toISOString() };

      await store.multi([
        ['set', orderKey(id), updated],
        ['srem', statusKey(order.status), id],
        ['sadd', statusKey(nextStatus), id],
      ]);

      return updated;
    },

    async summary(day = today()) {
      const stats = await store.hGetAll(statsKey(day));
      const ids = await store.sMembers(dayKey(day));
      const orders = (await Promise.all(ids.map((id) => store.get(orderKey(id))))).filter(Boolean);

      const byStatus = Object.fromEntries(ORDER_STATUSES.map((status) => [status, 0]));
      for (const order of orders) {
        if (byStatus[order.status] !== undefined) byStatus[order.status] += 1;
      }

      return {
        date: day,
        orderCount: Number(stats.orderCount || orders.length || 0),
        revenueCents: Number(stats.revenueCents || 0),
        byStatus,
      };
    },

    /** Used before deleting a menu item: open orders still reference it. */
    async isItemInOpenOrders(itemId) {
      const openStatuses = ['pending', 'preparing', 'ready'];
      for (const status of openStatuses) {
        const ids = await store.sMembers(statusKey(status));
        const orders = (await Promise.all(ids.map((id) => store.get(orderKey(id))))).filter(Boolean);
        if (orders.some((order) => order.items.some((line) => line.itemId === itemId))) {
          return true;
        }
      }
      return false;
    },
  };
}
