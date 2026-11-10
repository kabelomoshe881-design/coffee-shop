import { z } from 'zod';
import { CATEGORIES } from './repositories/menu.js';
import { ORDER_STATUSES } from './repositories/orders.js';

export const menuCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  description: z.string().trim().max(300).optional().default(''),
  priceCents: z
    .number({ invalid_type_error: 'Price must be a number' })
    .int('Price must be a whole number of cents')
    .min(50, 'Price must be at least R0.50')
    .max(500000, 'Price must be at most R5000.00'),
  category: z.enum(CATEGORIES, { errorMap: () => ({ message: `Category must be one of ${CATEGORIES.join(', ')}` }) }),
  available: z.boolean().optional().default(true),
});

export const menuUpdateSchema = menuCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  { message: 'Provide at least one field to update' }
);

export const orderCreateSchema = z.object({
  customerName: z.string().trim().min(2, 'Tell us who the order is for').max(60),
  note: z.string().trim().max(200).optional(),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1),
        qty: z.number().int().min(1, 'Quantity must be at least 1').max(20, 'Maximum 20 per item'),
      })
    )
    .min(1, 'Add at least one item to the order')
    .max(30, 'An order can hold at most 30 lines'),
});

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES, {
    errorMap: () => ({ message: `Status must be one of ${ORDER_STATUSES.join(', ')}` }),
  }),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});
