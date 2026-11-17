import type { AppConfig } from '../../config';
import type { LLMProvider } from './LLMProvider';
import { MockLLMProvider } from './mock';
import { OpenAILLMProvider } from './openai';

export type { LLMProvider };

export function createLLMProvider(config: AppConfig): LLMProvider {
  if (config.provider === 'openai' && config.openaiApiKey) {
    return new OpenAILLMProvider(config.openaiApiKey, config.chatModel);
  }
  return new MockLLMProvider();
}
