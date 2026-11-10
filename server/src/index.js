import { config, warnAboutInsecureDefaults } from './config.js';
import { createRedisStore } from './store/redis.js';
import { createFileStore } from './store/file.js';
import { createMenuRepository } from './repositories/menu.js';
import { MENU_ITEMS } from './data/menu-seed.js';
import { createApp } from './app.js';

const store =
  config.storeDriver === 'redis'
    ? createRedisStore(config.redisUrl)
    : await createFileStore(config.dataFile);

warnAboutInsecureDefaults();

/**
 * A fresh deployment starts with an empty database. Rather than making the
 * first visitor see an empty menu, load the starting menu once. Safe to leave
 * on: it only writes when the menu is completely empty.
 */
async function seedIfEmpty() {
  if (!config.autoSeed) return;
  try {
    const menu = createMenuRepository(store);
    const existing = await menu.list();
    if (existing.length > 0) return;
    for (const item of MENU_ITEMS) await menu.create(item);
    console.log(`[seed] menu was empty - loaded ${MENU_ITEMS.length} starting items`);
  } catch (err) {
    // Never stop the API from booting because seeding failed.
    console.warn(`[seed] skipped: ${err.message}`);
  }
}

await seedIfEmpty();

const app = createApp({ store, config });

const server = app.listen(config.port, () => {
  console.log('');
  console.log('  Coffee Shop API');
  console.log(`  listening   http://localhost:${config.port}`);
  console.log(`  health      http://localhost:${config.port}/api/health`);
  console.log(`  store       ${store.driver}${store.driver === 'file' ? ` (${config.dataFile})` : ''}`);
  console.log(`  frontend    ${config.frontendUrl.join(', ')}`);
  console.log('');
});

async function shutdown(signal) {
  console.log(`\n[${signal}] shutting down...`);
  server.close(async () => {
    await store.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 8000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
