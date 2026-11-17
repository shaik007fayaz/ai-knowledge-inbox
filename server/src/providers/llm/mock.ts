import { tokenize } from '../embedding/text';
import type { GenerateInput, GenerateOutput, LLMProvider } from './LLMProvider';

/** Extractive "LLM": picks the best-matching sentences from the context and cites them. Deterministic. */
export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock' as const;

  async generate(input: GenerateInput): Promise<GenerateOutput> {
    const wanted = new Set(tokenize(input.question));
    const scored: Array<{ marker: number; sentence: string; score: number }> = [];
    for (const passage of input.context) {
      for (const sentence of passage.text.split(/(?<=[.!?])\s+|\n+/)) {
        const s = sentence.trim();
        if (!s) continue;
        const score = tokenize(s).filter((t) => wanted.has(t)).length;
        if (score > 0) scored.push({ marker: passage.marker, sentence: s, score });
      }
    }
    scored.sort((a, b) => b.score - a.score);
    const picked: typeof scored = [];
    for (const candidate of scored) {
      if (picked.length < 2 && !picked.some((p) => p.marker === candidate.marker)) picked.push(candidate);
    }
    if (picked.length === 0) return { text: "I couldn't find that in your saved content." };
    const body = picked.map((p) => `${p.sentence} [${p.marker}]`).join(' ');
    return { text: `Based on your saved content: ${body}` };
  }
}
