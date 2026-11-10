import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, validate, AppError } from '../middleware/errors.js';
import { requireStaff } from '../middleware/auth.js';
import { orderCreateSchema, orderStatusSchema } from '../schemas.js';
import { ORDER_STATUSES } from '../repositories/orders.js';

const createOrderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many orders from this address. Try again shortly.' } },
});

export function orderRoutes(orders) {
  const router = Router();

  // Staff: list orders, optionally filtered by status or day.
  router.get(
    '/',
    requireStaff,
    asyncHandler(async (req, res) => {
      const { status, date } = req.query;
      if (status && !ORDER_STATUSES.includes(status)) {
        throw new AppError(400, 'VALIDATION_ERROR', `Status must be one of ${ORDER_STATUSES.join(', ')}`);
      }
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Date must use the YYYY-MM-DD format');
      }
      const list = await orders.list({ status, date });
      res.json({ data: list, count: list.length });
    })
  );

  // Staff: daily totals. Declared before /:id so "summary" is not read as an id.
  router.get(
    '/summary/today',
    requireStaff,
    asyncHandler(async (req, res) => {
      res.json({ data: await orders.summary() });
    })
  );

  // Public: a customer needs this to see their confirmation page.
  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const order = await orders.get(req.params.id);
      if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
      res.json({ data: order });
    })
  );

  // Public: place an order. Totals are recomputed server-side, never trusted from the client.
  router.post(
    '/',
    createOrderLimiter,
    validate(orderCreateSchema),
    asyncHandler(async (req, res) => {
      const order = await orders.create(req.body);
      res.status(201).location(`/api/orders/${order.id}`).json({ data: order });
    })
  );

  // Staff: advance the order workflow.
  router.patch(
    '/:id/status',
    requireStaff,
    validate(orderStatusSchema),
    asyncHandler(async (req, res) => {
      const order = await orders.updateStatus(req.params.id, req.body.status);
      if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found');
      res.json({ data: order });
    })
  );

  return router;
}
