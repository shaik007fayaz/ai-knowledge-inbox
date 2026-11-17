import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { Logger } from '../logger';

/** Assigns a request id (echoed as x-request-id), attaches a child logger, logs one line per request. */
export function requestContext(logger: Logger): RequestHandler {
  return (req, res, next) => {
    const incoming = req.header('x-request-id');
    req.id = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID();
    req.log = logger.child({ requestId: req.id });
    res.setHeader('x-request-id', req.id);
    const started = Date.now();
    res.on('finish', () => {
      req.log.info(
        { method: req.method, path: req.originalUrl.split('?')[0], status: res.statusCode, durationMs: Date.now() - started },
        'request completed',
      );
    });
    next();
  };
}
