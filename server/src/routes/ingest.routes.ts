import { Router } from 'express';
import type { Container } from '../container';
import { asyncHandler } from '../middleware/asyncHandler';
import { ingestSchema } from '../schemas/ingest';

export function ingestRouter(c: Container): Router {
  const router = Router();
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const input = ingestSchema.parse(req.body);
      const result = await c.ingest.submit(input);
      res.status(202).json(result);
    }),
  );
  return router;
}
