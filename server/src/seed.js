import { config } from './config.js';
import { createRedisStore } from './store/redis.js';
import { createFileStore } from './store/file.js';
import { createMenuRepository } from './repositories/menu.js';
import { MENU_ITEMS } from './data/menu-seed.js';

const store =
  config.storeDriver === 'redis'
    ? createRedisStore(config.redisUrl)
    : await createFileStore(config.dataFile);

const menu = createMenuRepository(store);
const existing = await menu.list();

if (existing.length && !process.argv.includes('--force')) {
  console.log(`Menu already has ${existing.length} items. Re-run with --force to add the seed set again.`);
} else {
  for (const item of MENU_ITEMS) await menu.create(item);
  console.log(`Seeded ${MENU_ITEMS.length} menu items using the "${store.driver}" driver.`);
}

await store.close();
process.exit(0);
