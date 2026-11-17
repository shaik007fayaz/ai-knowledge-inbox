import { Router } from 'express';
import type { Container } from '../container';
import { NotFoundError } from '../errors';
import { listItemsSchema } from '../schemas/query';
import { toItemDetailDto, toItemDto } from './serializers';

export function itemsRouter(c: Container): Router {
  const router = Router();

  router.get('/', (req, res) => {
    const { limit, offset } = listItemsSchema.parse(req.query);
    res.json({
      items: c.items.list(limit, offset).map(toItemDto),
      total: c.items.total(),
      limit,
      offset,
    });
  });

  router.get('/:id', (req, res) => {
    const item = c.items.getWithCount(req.params.id);
    if (!item) throw new NotFoundError('Item not found');
    res.json(toItemDetailDto(item));
  });

  router.delete('/:id', (req, res) => {
    if (!c.items.delete(req.params.id)) throw new NotFoundError('Item not found');
    res.status(204).end();
  });

  router.post('/:id/retry', (req, res) => {
    c.ingest.retry(req.params.id);
    res.status(202).json({ id: req.params.id, status: 'pending' });
  });

  return router;
}
