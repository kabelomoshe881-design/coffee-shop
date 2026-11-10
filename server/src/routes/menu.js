import { Router } from 'express';
import { asyncHandler, validate, AppError } from '../middleware/errors.js';
import { requireStaff } from '../middleware/auth.js';
import { menuCreateSchema, menuUpdateSchema } from '../schemas.js';
import { CATEGORIES } from '../repositories/menu.js';

export function menuRoutes(menu, orders) {
  const router = Router();

  // GET /api/menu?category=coffee&available=true
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const { category, available } = req.query;

      if (category && !CATEGORIES.includes(category)) {
        throw new AppError(400, 'VALIDATION_ERROR', `Category must be one of ${CATEGORIES.join(', ')}`);
      }

      const items = await menu.list({
        category,
        available: available === undefined ? undefined : available === 'true',
      });

      res.json({ data: items, count: items.length });
    })
  );

  router.get(
    '/:id',
    asyncHandler(async (req, res) => {
      const item = await menu.get(req.params.id);
      if (!item) throw new AppError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
      res.json({ data: item });
    })
  );

  router.post(
    '/',
    requireStaff,
    validate(menuCreateSchema),
    asyncHandler(async (req, res) => {
      const item = await menu.create(req.body);
      res.status(201).location(`/api/menu/${item.id}`).json({ data: item });
    })
  );

  router.put(
    '/:id',
    requireStaff,
    validate(menuUpdateSchema),
    asyncHandler(async (req, res) => {
      const item = await menu.update(req.params.id, req.body);
      if (!item) throw new AppError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
      res.json({ data: item });
    })
  );

  router.delete(
    '/:id',
    requireStaff,
    asyncHandler(async (req, res) => {
      const existing = await menu.get(req.params.id);
      if (!existing) throw new AppError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');

      if (await orders.isItemInOpenOrders(req.params.id)) {
        throw new AppError(
          409,
          'ITEM_IN_USE',
          'This item is part of an open order. Mark it unavailable instead of deleting it.'
        );
      }

      await menu.remove(req.params.id);
      res.status(204).send();
    })
  );

  return router;
}
