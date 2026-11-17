import { Router } from 'express';
import type { Container } from '../container';

export function healthRouter(c: Container): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    c.db.prepare('SELECT 1').get();
    res.json({ status: 'ok', db: 'ok', provider: c.config.provider });
  });
  return router;
}
