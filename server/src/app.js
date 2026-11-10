import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createMenuRepository } from './repositories/menu.js';
import { createOrderRepository } from './repositories/orders.js';
import { menuRoutes } from './routes/menu.js';
import { orderRoutes } from './routes/orders.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { AppError, notFoundHandler, errorHandler } from './middleware/errors.js';

export function createApp({ store, config }) {
  const menu = createMenuRepository(store);
  const orders = createOrderRepository(store, menu);

  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // No Origin header (curl, health checks, same-origin) is always allowed.
        if (!origin) return callback(null, true);
        if (config.frontendUrl.includes(origin)) return callback(null, true);
        if (!config.isProduction) return callback(null, true);
        return callback(new AppError(403, 'CORS_BLOCKED', `Origin ${origin} is not allowed`));
      },
    })
  );
  app.use(express.json({ limit: '32kb' }));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: 'Too many requests. Slow down.' } },
    })
  );

  app.get('/', (req, res) => {
    res.json({
      name: 'Coffee Shop API',
      version: '1.0.0',
      docs: '/api/health',
      endpoints: ['/api/menu', '/api/orders', '/api/auth/login', '/api/health'],
    });
  });

  app.use('/api/health', healthRoutes(store));
  app.use('/api/menu', menuRoutes(menu, orders));
  app.use('/api/orders', orderRoutes(orders));
  app.use('/api/auth', authRoutes());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
