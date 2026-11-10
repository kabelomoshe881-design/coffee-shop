import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AppError } from './errors.js';

const DEMO_PASSWORD = 'coffee123';

export function verifyStaffCredentials(username, password) {
  if (username !== config.staffUsername) return false;

  if (config.staffPasswordHash) {
    return bcrypt.compareSync(password, config.staffPasswordHash);
  }

  // Demo fallback so the project runs with zero configuration.
  return password === DEMO_PASSWORD;
}

export function signStaffToken(username) {
  return jwt.sign({ sub: username, role: 'staff' }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export function requireStaff(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'A staff bearer token is required'));
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (payload.role !== 'staff') {
      return next(new AppError(403, 'FORBIDDEN', 'This action requires a staff account'));
    }
    req.staff = { username: payload.sub };
    return next();
  } catch {
    return next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}
