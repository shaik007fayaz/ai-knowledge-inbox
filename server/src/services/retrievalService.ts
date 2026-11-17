import type { EmbeddingProvider } from '../providers/embedding';
import type { VectorHit, VectorStore } from '../vectorstore/VectorStore';

export interface RetrievalResult {
  hits: VectorHit[];
  embedMs: number;
  retrieveMs: number;
}

const MAX_CHUNKS_PER_ITEM = 3;

export class RetrievalService {
  constructor(
    private readonly embedder: EmbeddingProvider,
    private readonly vectorStore: VectorStore,
    private readonly minScore?: number,
  ) {}

  async retrieve(question: string, topK: number): Promise<RetrievalResult> {
    const t0 = performance.now();
    const [queryVector] = await this.embedder.embed([question]);
    const t1 = performance.now();
    const hits = this.vectorStore.search(queryVector, {
      k: topK,
      minScore: this.minScore ?? this.embedder.defaultMinScore,
      maxPerItem: MAX_CHUNKS_PER_ITEM,
      model: this.embedder.model,
    });
    const t2 = performance.now();
    return { hits, embedMs: Math.round(t1 - t0), retrieveMs: Math.round(t2 - t1) };
  }
}
