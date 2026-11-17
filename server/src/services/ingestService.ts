import { AppError, ConflictError, NotFoundError, UnprocessableError, UpstreamError } from '../errors';
import type { ItemsRepo } from '../db/itemsRepo';
import type { Logger } from '../logger';
import type { EmbeddingProvider } from '../providers/embedding';
import type { VectorStore } from '../vectorstore/VectorStore';
import { withRetry } from '../utils/retry';
import { truncate } from '../utils/text';
import { chunkText, chunkTokenEstimate, embeddingInput } from './chunker';
import type { JobRunner } from './jobRunner';
import type { UrlGuard } from './ssrf';
import type { PageFetcher } from './urlFetcher';

export type IngestInput =
  | { type: 'note'; content: string; title?: string }
  | { type: 'url'; url: string; title?: string };

export interface IngestDeps {
  items: ItemsRepo;
  vectorStore: VectorStore;
  embedder: EmbeddingProvider;
  fetchPage: PageFetcher;
  guardUrl: UrlGuard;
  jobs: JobRunner;
  logger: Logger;
  retry: { attempts: number; baseDelayMs: number };
}

const EMBED_BATCH_SIZE = 32;

/** Orchestrates ingestion: accept quickly (pending), then fetch -> chunk -> embed -> store in the background. */
export class IngestService {
  constructor(private readonly deps: IngestDeps) {}

  async submit(input: IngestInput): Promise<{ id: string; status: 'pending' }> {
    const { items } = this.deps;
    if (input.type === 'note') {
      const title = input.title ?? truncate(input.content.split('\n')[0], 60);
      const item = items.create({ sourceType: 'note', title, url: null, rawContent: input.content });
      this.enqueue(item.id);
      return { id: item.id, status: 'pending' };
    }

    const url = new URL(input.url).href;
    await this.deps.guardUrl(url); // reject private addresses synchronously with a 422
    const existing = items.findByUrl(url);
    if (existing) {
      if (existing.status !== 'failed') {
        throw new ConflictError('That URL is already saved', 'DUPLICATE_URL', { existingId: existing.id });
      }
      items.setStatus(existing.id, 'pending');
      this.enqueue(existing.id);
      return { id: existing.id, status: 'pending' };
    }
    const item = items.create({ sourceType: 'url', title: input.title ?? null, url, rawContent: '' });
    this.enqueue(item.id);
    return { id: item.id, status: 'pending' };
  }

  retry(id: string): void {
    const item = this.deps.items.get(id);
    if (!item) throw new NotFoundError('Item not found');
    if (item.status !== 'failed') throw new ConflictError('Only failed items can be retried', 'NOT_RETRYABLE');
    this.deps.items.setStatus(id, 'pending');
    this.enqueue(id);
  }

  /** Crash recovery: anything left pending/processing by a previous run is queued again. */
  recoverPending(): number {
    const stuck = this.deps.items.listByStatus(['pending', 'processing']);
    stuck.forEach((item) => this.enqueue(item.id));
    return stuck.length;
  }

  private enqueue(id: string): void {
    this.deps.jobs.add(`ingest:${id}`, () => this.process(id));
  }

  async process(id: string): Promise<void> {
    const { items, vectorStore, embedder, fetchPage, retry } = this.deps;
    const item = items.get(id);
    if (!item) return;
    const log = this.deps.logger.child({ itemId: id, sourceType: item.source_type });
    const started = Date.now();
    const retryOptions = {
      attempts: retry.attempts,
      baseDelayMs: retry.baseDelayMs,
      shouldRetry: (e: unknown) => e instanceof UpstreamError,
      onRetry: (e: unknown, attempt: number) => log.warn({ err: e, attempt }, 'Transient failure, retrying'),
    };

    try {
      items.setStatus(id, 'processing');
      let title = item.title;
      let text = item.raw_content;

      if (item.source_type === 'url') {
        const t = Date.now();
        const page = await withRetry(() => fetchPage(item.url!), retryOptions);
        title = title ?? page.title ?? new URL(item.url!).hostname;
        text = page.text;
        items.setFetched(id, title, text);
        log.info({ durationMs: Date.now() - t, chars: text.length }, 'Fetched page');
      }

      const chunks = chunkText(text);
      if (chunks.length === 0) throw new UnprocessableError('There is no text to index', 'NO_READABLE_CONTENT');
      log.info({ chunks: chunks.length }, 'Chunked content');

      const t = Date.now();
      const vectors: Float32Array[] = [];
      for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
        const batch = chunks.slice(i, i + EMBED_BATCH_SIZE).map((c) => embeddingInput(title, c));
        vectors.push(...(await withRetry(() => embedder.embed(batch), retryOptions)));
      }
      log.info({ durationMs: Date.now() - t, model: embedder.model }, 'Embedded chunks');

      vectorStore.replaceForItem(
        id,
        embedder.model,
        chunks.map((content, i) => ({ content, tokenEstimate: chunkTokenEstimate(content), embedding: vectors[i] })),
      );
      items.setStatus(id, 'ready');
      log.info({ totalMs: Date.now() - started }, 'Item ready');
    } catch (err) {
      const message = err instanceof AppError ? err.message : 'Unexpected error while processing this item';
      items.setStatus(id, 'failed', message);
      log.error({ err, totalMs: Date.now() - started }, 'Item failed');
    }
  }
}
