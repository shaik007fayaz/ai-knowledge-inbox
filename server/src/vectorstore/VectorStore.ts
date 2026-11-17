import type { ChunkInsert } from '../db/chunksRepo';

export interface VectorHit {
  chunkId: string;
  itemId: string;
  title: string | null;
  url: string | null;
  content: string;
  score: number;
}

export interface SearchOptions {
  k: number;
  minScore: number;
  /** Stops one long item from filling every result slot. */
  maxPerItem: number;
  /** Only chunks embedded with this model are compared. */
  model: string;
}

/** Swap this implementation for sqlite-vec, pgvector or a hosted vector DB without touching callers. */
export interface VectorStore {
  replaceForItem(itemId: string, model: string, chunks: ChunkInsert[]): void;
  search(query: Float32Array, options: SearchOptions): VectorHit[];
}
