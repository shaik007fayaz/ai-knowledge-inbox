import { UpstreamError } from '../errors';
import { sleep } from '../utils/retry';

interface PostOptions {
  headers: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

const isTimeout = (err: unknown): boolean => err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');

/** POST JSON with a timeout and retries on network errors, 429 and 5xx. Always throws UpstreamError. */
export async function postJson<T>(url: string, body: unknown, options: PostOptions): Promise<T> {
  const { headers, timeoutMs = 30_000, retries = 1 } = options;
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      const error = isTimeout(err)
        ? new UpstreamError('The AI provider timed out', 504, 'UPSTREAM_TIMEOUT')
        : new UpstreamError('Could not reach the AI provider');
      if (attempt < retries) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw error;
    }
    if (res.ok) return (await res.json()) as T;
    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < retries) {
      await sleep(500 * 2 ** attempt);
      continue;
    }
    throw new UpstreamError(`The AI provider returned HTTP ${res.status}`);
  }
}
