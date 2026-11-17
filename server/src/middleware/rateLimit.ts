import type { RequestHandler } from 'express';
import { RateLimitError } from '../errors';

/** Fixed-window per-IP limiter. In-memory, single-process: enough here, use Redis when scaling out. */
export function rateLimit(options: { windowMs: number; max: number }): RequestHandler {
  const windows = new Map<string, { count: number; resetAt: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, w] of windows) if (w.resetAt <= now) windows.delete(key);
  }, options.windowMs).unref();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip ?? 'unknown';
    let w = windows.get(key);
    if (!w || w.resetAt <= now) {
      w = { count: 0, resetAt: now + options.windowMs };
      windows.set(key, w);
    }
    w.count++;
    if (w.count > options.max) {
      res.setHeader('Retry-After', String(Math.ceil((w.resetAt - now) / 1000)));
      return next(new RateLimitError());
    }
    next();
  };
}
