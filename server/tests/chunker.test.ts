import { describe, expect, it } from 'vitest';
import { chunkText, embeddingInput } from '../src/services/chunker';

describe('chunkText', () => {
  it('returns no chunks for empty or whitespace-only text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('  \n\n \t ')).toEqual([]);
  });

  it('keeps a short note as a single chunk', () => {
    expect(chunkText('Remember to renew the passport.')).toEqual(['Remember to renew the passport.']);
  });

  it('splits one giant paragraph without ever exceeding the limit', () => {
    const sentence = 'This is a sentence about chunking. ';
    const text = sentence.repeat(300);
    const chunks = chunkText(text, { targetTokens: 100, overlapTokens: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(400);
  });

  it('hard-splits a single unbroken string longer than the limit', () => {
    const chunks = chunkText('x'.repeat(1000), { targetTokens: 50, overlapTokens: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join('')).toHaveLength(1000);
  });

  it('handles unicode and emoji without breaking surrogate pairs', () => {
    const chunks = chunkText('😀'.repeat(500), { targetTokens: 25, overlapTokens: 0 });
    expect(chunks.join('')).toBe('😀'.repeat(500));
    for (const c of chunks) expect(Array.from(c).every((ch) => ch === '😀')).toBe(true);
  });

  it('repeats trailing sentences of the previous chunk as overlap', () => {
    const sentences = Array.from({ length: 12 }, (_, i) => `Sentence number ${i} has some filler words in it.`);
    const chunks = chunkText(sentences.join(' '), { targetTokens: 40, overlapTokens: 15 });
    expect(chunks.length).toBeGreaterThan(1);
    const lastOfFirst = chunks[0].split('\n').pop()!;
    expect(chunks[1]).toContain(lastOfFirst);
  });

  it('prefixes the title for embedding only when a title exists', () => {
    expect(embeddingInput('My note', 'body')).toBe('Title: My note\n\nbody');
    expect(embeddingInput(null, 'body')).toBe('body');
  });
});
