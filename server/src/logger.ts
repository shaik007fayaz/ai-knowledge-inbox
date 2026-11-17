import pino, { type Logger } from 'pino';

export type { Logger };

export function createLogger(level: string): Logger {
  const pretty = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' && level !== 'silent';
  return pino({
    level,
    base: undefined,
    transport: pretty ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } : undefined,
  });
}
