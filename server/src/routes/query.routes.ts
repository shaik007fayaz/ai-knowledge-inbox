import { Router } from 'express';
import type { Container } from '../container';
import { asyncHandler } from '../middleware/asyncHandler';
import { querySchema } from '../schemas/query';

export function queryRouter(c: Container): Router {
  const router = Router();
  router.post(
    '/',
    asyncHandler(async (req, res) => {
      const { question, topK } = querySchema.parse(req.body);
      res.json(await c.rag.answer(question, topK, req.log));
    }),
  );
  return router;
}
