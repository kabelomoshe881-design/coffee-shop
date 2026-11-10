import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(here, '..');

const env = process.env.NODE_ENV || 'development';
const redisUrl = process.env.REDIS_URL || '';

export const config = {
  env,
  isProduction: env === 'production',
  port: Number(process.env.PORT || 4000),

  // Comma-separated list is supported so preview deploys keep working.
  frontendUrl: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',

  staffUsername: process.env.STAFF_USERNAME || 'staff',
  // bcrypt hash. Generate with: npm run hash -- "your-password"
  staffPasswordHash: process.env.STAFF_PASSWORD_HASH || '',

  // Falls back to a JSON file so the project runs with zero setup.
  // Set REDIS_URL (Upstash / Render Key Value / local Redis) for the real thing.
  storeDriver: process.env.STORE_DRIVER || (redisUrl ? 'redis' : 'file'),
  redisUrl,
  dataFile: process.env.DATA_FILE || path.join(serverRoot, 'data', 'db.json'),

  // Loads the starting menu when the database is empty, so a fresh deploy
  // is usable immediately. Set AUTO_SEED=false to disable.
  autoSeed: process.env.AUTO_SEED !== 'false',
};

export function warnAboutInsecureDefaults() {
  const warnings = [];
  if (!config.staffPasswordHash) {
    warnings.push(
      'STAFF_PASSWORD_HASH is not set - using the demo password "coffee123". Set it before deploying.'
    );
  }
  if (config.isProduction && config.jwtSecret === 'dev-only-insecure-secret-change-me') {
    warnings.push('JWT_SECRET is the development default. Set a long random value in production.');
  }
  if (config.isProduction && config.storeDriver === 'file') {
    warnings.push(
      'STORE_DRIVER=file is not durable on ephemeral hosts. Set REDIS_URL for production.'
    );
  }
  for (const line of warnings) console.warn(`[warn] ${line}`);
}
