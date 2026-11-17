import { UpstreamError } from '../../errors';
import { postJson } from '../http';
import type { GenerateInput, GenerateOutput, LLMProvider } from './LLMProvider';

interface ChatResponse {
  choices: Array<{ message: { content: string | null } }>;
  usage?: { prompt_tokens: number; completion_tokens: number };
}

export class OpenAILLMProvider implements LLMProvider {
  readonly name = 'openai' as const;

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const res = await postJson<ChatResponse>(
      'https://api.openai.com/v1/chat/completions',
      {
        model: this.model,
        temperature: 0.1,
        messages: [
          { role: 'system', content: input.system },
          { role: 'user', content: input.user },
        ],
      },
      { headers: { Authorization: `Bearer ${this.apiKey}` }, timeoutMs: 45_000 },
    );
    const text = res.choices[0]?.message.content?.trim();
    if (!text) throw new UpstreamError('The AI provider returned an empty answer');
    return {
      text,
      usage: res.usage && { promptTokens: res.usage.prompt_tokens, completionTokens: res.usage.completion_tokens },
    };
  }
}
