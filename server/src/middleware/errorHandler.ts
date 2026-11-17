import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, NotFoundError, PayloadTooLargeError, ValidationError } from '../errors';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.path} not found`));
};

function normalize(err: unknown): AppError | null {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join('.') || 'body', message: i.message }));
    return new ValidationError(details[0] ? `${details[0].field}: ${details[0].message}` : 'Invalid request', details);
  }
  const type = (err as { type?: string } | null)?.type; // body-parser errors
  if (type === 'entity.too.large') return new PayloadTooLargeError();
  if (type === 'entity.parse.failed') return new ValidationError('Request body is not valid JSON');
  return null;
}

/** Maps every error to { error: { code, message, details? } }. Unknown errors become a generic 500. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const known = normalize(err);
  if (known) {
    req.log.warn({ code: known.code, status: known.status, message: known.message }, 'request failed');
    res.status(known.status).json({
      error: { code: known.code, message: known.message, ...(known.details !== undefined && { details: known.details }) },
    });
    return;
  }
  req.log.error({ err }, 'unexpected error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our side' } });
};
