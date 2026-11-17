import { UnprocessableError, UpstreamError } from '../errors';
import { extractFromHtml, extractFromPlainText, type ExtractedPage } from './extractText';
import { assertPublicUrl, type UrlGuard } from './ssrf';

export type PageFetcher = (url: string) => Promise<ExtractedPage>;

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const MIN_TEXT_CHARS = 50;
const USER_AGENT = 'AIKnowledgeInbox/1.0 (+personal knowledge tool)';

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return '';
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new UnprocessableError('The page is larger than 2 MB', 'PAGE_TOO_LARGE');
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/** Fetches a page safely: SSRF check on every hop, manual redirects, timeout, size and content-type limits. */
export function createPageFetcher(guard: UrlGuard = assertPublicUrl): PageFetcher {
  return async (startUrl) => {
    let current = startUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      await guard(current);
      let res: Response;
      try {
        res = await fetch(current, {
          redirect: 'manual',
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,text/plain;q=0.9' },
        });
      } catch (err) {
        const timedOut = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
        throw new UpstreamError(timedOut ? 'The page took too long to respond' : 'Could not download the page', timedOut ? 504 : 502);
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) throw new UnprocessableError('The page redirected without a destination', 'UNREACHABLE_URL');
        current = new URL(location, current).href;
        continue;
      }
      if (res.status >= 500) throw new UpstreamError(`The site returned HTTP ${res.status}`);
      if (!res.ok) throw new UnprocessableError(`The site returned HTTP ${res.status}`, 'UNREACHABLE_URL');

      const contentType = res.headers.get('content-type') ?? '';
      const isHtml = contentType.includes('text/html');
      if (!isHtml && !contentType.includes('text/plain')) {
        throw new UnprocessableError(`Unsupported content type "${contentType || 'unknown'}"`, 'UNSUPPORTED_CONTENT');
      }
      const body = await readCapped(res);
      const page = isHtml ? extractFromHtml(body) : extractFromPlainText(body);
      if (page.text.length < MIN_TEXT_CHARS) {
        throw new UnprocessableError('No readable text was found on that page', 'NO_READABLE_CONTENT');
      }
      return page;
    }
    throw new UnprocessableError('The page redirected too many times', 'TOO_MANY_REDIRECTS');
  };
}
