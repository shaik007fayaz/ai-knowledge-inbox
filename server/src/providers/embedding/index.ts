import type { AppConfig } from '../../config';
import type { EmbeddingProvider } from './EmbeddingProvider';
import { MockEmbeddingProvider } from './mock';
import { OpenAIEmbeddingProvider } from './openai';

export type { EmbeddingProvider };

export function createEmbeddingProvider(config: AppConfig): EmbeddingProvider {
  if (config.provider === 'openai' && config.openaiApiKey) {
    return new OpenAIEmbeddingProvider(config.openaiApiKey, config.embeddingModel);
  }
  return new MockEmbeddingProvider();
}
