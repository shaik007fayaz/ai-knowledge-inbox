import type { EmbeddingProvider } from './EmbeddingProvider';
import { tokenize } from './text';

const DIMENSIONS = 2048;

/** FNV-1a 32-bit hash. */
function hash(token: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic bag-of-words hashing embedder. No network, no API key; good enough to demo and test. */
export class MockEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'mock' as const;
  readonly model = 'mock-hash-2048';
  readonly defaultMinScore = 0.2;

  async embed(texts: string[]): Promise<Float32Array[]> {
    return texts.map((t) => this.embedOne(t));
  }

  private embedOne(text: string): Float32Array {
    const vec = new Float32Array(DIMENSIONS);
    for (const token of tokenize(text)) vec[hash(token) % DIMENSIONS] += 1;
    let norm = 0;
    for (const v of vec) norm += v * v;
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < vec.length; i++) vec[i] /= norm;
    return vec;
  }
}
