export interface ContextPassage {
  marker: number;
  title: string;
  text: string;
}

export interface GenerateInput {
  system: string;
  user: string;
  /** Structured copy of the context; only the mock provider uses it. */
  question: string;
  context: ContextPassage[];
}

export interface GenerateOutput {
  text: string;
  usage?: { promptTokens: number; completionTokens: number };
}

export interface LLMProvider {
  readonly name: 'openai' | 'mock';
  generate(input: GenerateInput): Promise<GenerateOutput>;
}
