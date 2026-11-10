import { randomUUID } from 'node:crypto';

export const MENU_INDEX = 'menu:index';
export const CATEGORIES = ['coffee', 'tea', 'pastry', 'other'];

const itemKey = (id) => `menu:item:${id}`;
const categoryKey = (category) => `menu:category:${category}`;

export function createMenuRepository(store) {
  return {
    async list({ category, available } = {}) {
      const ids = category
        ? await store.sMembers(categoryKey(category))
        : await store.sMembers(MENU_INDEX);

      const items = (await Promise.all(ids.map((id) => store.get(itemKey(id))))).filter(Boolean);

      return items
        .filter((item) => (available === undefined ? true : item.available === available))
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async get(id) {
      return store.get(itemKey(id));
    },

    async create({ name, description, priceCents, category, available }) {
      const now = new Date().toISOString();
      const item = {
        id: randomUUID(),
        name,
        description: description ?? '',
        priceCents,
        category,
        available: available ?? true,
        createdAt: now,
        updatedAt: now,
      };

      await store.multi([
        ['set', itemKey(item.id), item],
        ['sadd', MENU_INDEX, item.id],
        ['sadd', categoryKey(item.category), item.id],
      ]);

      return item;
    },

    async update(id, patch) {
      const current = await store.get(itemKey(id));
      if (!current) return null;

      const next = { ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() };
      const ops = [['set', itemKey(id), next]];

      // Category is indexed in a second set, so a move needs two index writes.
      if (patch.category && patch.category !== current.category) {
        ops.push(['srem', categoryKey(current.category), id]);
        ops.push(['sadd', categoryKey(next.category), id]);
      }

      await store.multi(ops);
      return next;
    },

    async remove(id) {
      const current = await store.get(itemKey(id));
      if (!current) return null;

      await store.multi([
        ['del', itemKey(id)],
        ['srem', MENU_INDEX, id],
        ['srem', categoryKey(current.category), id],
      ]);

      return current;
    },
  };
}
