import express, { type Express } from 'express';
import type { Container } from './container';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';
import { requestContext } from './middleware/requestContext';
import { healthRouter } from './routes/health.routes';
import { ingestRouter } from './routes/ingest.routes';
import { itemsRouter } from './routes/items.routes';
import { queryRouter } from './routes/query.routes';

export function createApp(c: Container): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestContext(c.logger));
  app.use(express.json({ limit: '256kb' }));

  const limiter = rateLimit({ windowMs: 60_000, max: c.config.rateLimitMax });
  app.use('/health', healthRouter(c));
  app.use('/ingest', limiter, ingestRouter(c));
  app.use('/query', limiter, queryRouter(c));
  app.use('/items', itemsRouter(c));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
