import type { EmbeddingProvider } from './EmbeddingProvider';
import { postJson } from '../http';

interface EmbeddingResponse {
  data: Array<{ index: number; embedding: number[] }>;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai' as const;
  readonly defaultMinScore = 0.25;

  constructor(
    private readonly apiKey: string,
    readonly model: string,
  ) {}

  async embed(texts: string[]): Promise<Float32Array[]> {
    const res = await postJson<EmbeddingResponse>(
      'https://api.openai.com/v1/embeddings',
      { model: this.model, input: texts },
      { headers: { Authorization: `Bearer ${this.apiKey}` } },
    );
    return [...res.data].sort((a, b) => a.index - b.index).map((d) => Float32Array.from(d.embedding));
  }
}
