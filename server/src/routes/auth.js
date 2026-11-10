import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler, validate, AppError } from '../middleware/errors.js';
import { verifyStaffCredentials, signStaffToken } from '../middleware/auth.js';
import { loginSchema } from '../schemas.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Try again in 15 minutes.' } },
});

export function authRoutes() {
  const router = Router();

  router.post(
    '/login',
    loginLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
      const { username, password } = req.body;

      if (!verifyStaffCredentials(username, password)) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Username or password is incorrect');
      }

      res.json({ data: { token: signStaffToken(username), staff: { username } } });
    })
  );

  return router;
}
