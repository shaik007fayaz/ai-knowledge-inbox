import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const optionalNumber = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v.trim() === '' ? undefined : Number(v)))
  .refine((v) => v === undefined || Number.isFinite(v), 'must be a number');

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DB_PATH: z.string().default(path.resolve(__dirname, '../data/inbox.db')),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  PROVIDER: z.enum(['auto', 'mock', 'openai']).default('auto'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  MIN_SCORE: optionalNumber,
  JOB_CONCURRENCY: z.coerce.number().int().min(1).max(8).default(2),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
});

export interface AppConfig {
  port: number;
  dbPath: string;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  provider: 'mock' | 'openai';
  openaiApiKey?: string;
  embeddingModel: string;
  chatModel: string;
  /** Similarity threshold; undefined means "use the embedding provider's default". */
  minScore?: number;
  jobConcurrency: number;
  rateLimitMax: number;
  retryAttempts: number;
  retryBaseDelayMs: number;
}

/** Parses and validates env vars once at startup. Fails fast with a readable message. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env, overrides: Partial<AppConfig> = {}): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  const e = parsed.data;
  const apiKey = e.OPENAI_API_KEY?.trim() || undefined;
  if (e.PROVIDER === 'openai' && !apiKey) {
    throw new Error('PROVIDER=openai requires OPENAI_API_KEY to be set');
  }
  const provider = e.PROVIDER === 'auto' ? (apiKey ? 'openai' : 'mock') : e.PROVIDER;

  return {
    port: e.PORT,
    dbPath: e.DB_PATH,
    logLevel: e.LOG_LEVEL,
    provider,
    openaiApiKey: apiKey,
    embeddingModel: e.OPENAI_EMBEDDING_MODEL,
    chatModel: e.OPENAI_CHAT_MODEL,
    minScore: e.MIN_SCORE,
    jobConcurrency: e.JOB_CONCURRENCY,
    rateLimitMax: e.RATE_LIMIT_MAX,
    retryAttempts: 3,
    retryBaseDelayMs: 500,
    ...overrides,
  };
}
