export interface EmbeddingProvider {
  readonly name: 'openai' | 'mock';
  /** Stored with every chunk so vectors from different models are never compared. */
  readonly model: string;
  /** Similarity threshold below which a chunk is not considered relevant. */
  readonly defaultMinScore: number;
  embed(texts: string[]): Promise<Float32Array[]>;
}
