import type { ChunksRepo, ChunkInsert } from '../db/chunksRepo';
import type { Logger } from '../logger';
import { cosine } from './cosine';
import type { SearchOptions, VectorHit, VectorStore } from './VectorStore';

/** Vectors live as Float32 BLOBs in SQLite; search is an in-process brute-force cosine scan (O(N) per query). */
export class SqliteVectorStore implements VectorStore {
  constructor(
    private readonly chunks: ChunksRepo,
    private readonly logger: Logger,
  ) {}

  replaceForItem(itemId: string, model: string, chunks: ChunkInsert[]): void {
    this.chunks.replaceForItem(itemId, model, chunks);
  }

  search(query: Float32Array, options: SearchOptions): VectorHit[] {
    const all = this.chunks.allWithMeta();
    const comparable = all.filter((c) => c.embeddingModel === options.model);
    if (comparable.length < all.length) {
      this.logger.warn(
        { skipped: all.length - comparable.length, model: options.model },
        'Skipping chunks embedded with a different model; re-ingest them to include them in search',
      );
    }
    const ranked: VectorHit[] = comparable
      .map((c) => ({
        chunkId: c.id,
        itemId: c.itemId,
        title: c.title,
        url: c.url,
        content: c.content,
        score: cosine(query, c.embedding),
      }))
      .filter((h) => h.score >= options.minScore)
      .sort((a, b) => b.score - a.score);

    const perItem = new Map<string, number>();
    const hits: VectorHit[] = [];
    for (const hit of ranked) {
      const used = perItem.get(hit.itemId) ?? 0;
      if (used >= options.maxPerItem) continue;
      perItem.set(hit.itemId, used + 1);
      hits.push(hit);
      if (hits.length >= options.k) break;
    }
    return hits;
  }
}
