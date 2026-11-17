import { z } from 'zod';

export const querySchema = z.object({
  question: z.string().trim().min(3, 'Question must be at least 3 characters').max(1000, 'Question must be 1,000 characters or fewer'),
  topK: z.number().int().min(1).max(10).default(5),
});

export const listItemsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
