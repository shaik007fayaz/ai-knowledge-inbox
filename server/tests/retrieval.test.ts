import { describe, expect, it } from 'vitest';
import { MockEmbeddingProvider } from '../src/providers/embedding/mock';
import { cosine } from '../src/vectorstore/cosine';
import { buildUserPrompt, fitToBudget, parseCitations, SYSTEM_PROMPT, toPassages } from '../src/services/prompt';
import type { VectorHit } from '../src/vectorstore/VectorStore';

const hit = (content: string, score = 0.9): VectorHit => ({ chunkId: content, itemId: content, title: 'T', url: null, content, score });

describe('cosine', () => {
  it('is 1 for identical vectors, 0 for orthogonal and for zero vectors', () => {
    expect(cosine(Float32Array.of(1, 2, 3), Float32Array.of(1, 2, 3))).toBeCloseTo(1);
    expect(cosine(Float32Array.of(1, 0), Float32Array.of(0, 1))).toBe(0);
    expect(cosine(Float32Array.of(0, 0), Float32Array.of(1, 1))).toBe(0);
  });
});

describe('MockEmbeddingProvider', () => {
  const mock = new MockEmbeddingProvider();

  it('is deterministic', async () => {
    const [a] = await mock.embed(['Paris is the capital of France']);
    const [b] = await mock.embed(['Paris is the capital of France']);
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('ranks related text above unrelated text', async () => {
    const [q, related, unrelated] = await mock.embed([
      'What is the capital of France?',
      'Paris is the capital of France.',
      'Rust is a systems programming language.',
    ]);
    expect(cosine(q, related)).toBeGreaterThan(mock.defaultMinScore);
    expect(cosine(q, unrelated)).toBeLessThan(mock.defaultMinScore);
  });
});

describe('prompt helpers', () => {
  it('numbers sources and includes the question', () => {
    const prompt = buildUserPrompt('Why?', toPassages([hit('alpha'), hit('beta')]));
    expect(prompt).toContain('[1] T');
    expect(prompt).toContain('[2] T');
    expect(prompt).toContain('Question: Why?');
  });

  it('tells the model to treat sources as untrusted', () => {
    expect(SYSTEM_PROMPT).toMatch(/untrusted/i);
    expect(SYSTEM_PROMPT).toMatch(/ONLY/);
  });

  it('keeps at least one hit and stops at the budget', () => {
    const hits = [hit('a'.repeat(60)), hit('b'.repeat(60)), hit('c'.repeat(60))];
    expect(fitToBudget(hits, 100)).toHaveLength(1);
    expect(fitToBudget(hits, 130)).toHaveLength(2);
    expect(fitToBudget(hits, 1000)).toHaveLength(3);
  });

  it('parses only valid citation markers', () => {
    expect([...parseCitations('Yes [1] and also [3][1]. Bogus [9] and [0].', 3)].sort()).toEqual([1, 3]);
    expect(parseCitations('No citations here', 3).size).toBe(0);
  });
});
