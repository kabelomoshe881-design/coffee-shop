import { config, warnAboutInsecureDefaults } from './config.js';
import { createRedisStore } from './store/redis.js';
import { createFileStore } from './store/file.js';
import { createApp } from './app.js';

const store =
  config.storeDriver === 'redis'
    ? createRedisStore(config.redisUrl)
    : await createFileStore(config.dataFile);

warnAboutInsecureDefaults();

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
