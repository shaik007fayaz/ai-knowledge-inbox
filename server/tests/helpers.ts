import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { buildContainer, type Overrides } from '../src/container';

/** App wired with an in-memory DB, mock providers, no log output and instant retries. */
export function createTestApp(overrides: Overrides = {}) {
  const config = loadConfig({}, {
    dbPath: ':memory:',
    logLevel: 'silent',
    provider: 'mock',
    openaiApiKey: undefined,
    rateLimitMax: 10_000,
    retryBaseDelayMs: 1,
  });
  const container = buildContainer(config, overrides);
  return { container, app: createApp(container) };
}
