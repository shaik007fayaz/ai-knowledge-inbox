import { z } from 'zod';

const title = z.string().trim().min(1).max(200).optional();

const noteSchema = z.object({
  type: z.literal('note'),
  content: z.string().trim().min(1, 'Note cannot be empty').max(20_000, 'Note must be 20,000 characters or fewer'),
  title,
});

const urlSchema = z.object({
  type: z.literal('url'),
  url: z
    .string()
    .trim()
    .max(2048, 'URL is too long')
    .url('Enter a valid URL')
    .refine((u) => /^https?:\/\//i.test(u), 'URL must start with http:// or https://'),
  title,
});

export const ingestSchema = z.discriminatedUnion('type', [noteSchema, urlSchema]);
