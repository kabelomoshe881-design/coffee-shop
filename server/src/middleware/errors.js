export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(body)',
      message: issue.message,
    }));
    return next(new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', details));
  }
  req.body = result.data;
  return next();
};

export function notFoundHandler(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} does not exist`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  if (status >= 500) console.error('[error]', err);

  const body = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: status >= 500 ? 'Unexpected server error' : err.message,
    },
  };
  if (err.details) body.error.details = err.details;

  res.status(status).json(body);
}
