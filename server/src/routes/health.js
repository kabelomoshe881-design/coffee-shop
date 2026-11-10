import { Router } from 'express';
import { asyncHandler } from '../middleware/errors.js';

export function healthRoutes(store) {
  const router = Router();

  router.get(
    '/',
    asyncHandler(async (req, res) => {
      let storeOk = false;
      let storeError = null;

      try {
        storeOk = await store.ping();
      } catch (err) {
        storeError = err.message;
      }

      const healthy = storeOk;

      res.status(healthy ? 200 : 503).json({
        status: healthy ? 'ok' : 'degraded',
        service: 'coffee-shop-api',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        dependencies: {
          store: {
            driver: store.driver,
            ok: storeOk,
            ...(storeError ? { error: storeError } : {}),
          },
        },
      });
    })
  );

  return router;
}
