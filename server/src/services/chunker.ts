import { estimateTokens } from '../utils/text';

export interface ChunkOptions {
  /** Target chunk size in tokens (estimated as chars / 4). */
  targetTokens?: number;
  /** Tokens repeated from the end of the previous chunk so context is not lost at boundaries. */
  overlapTokens?: number;
}

const CHARS_PER_TOKEN = 4;

/** Splits a long sentence or word run into pieces of at most `max` characters (code-point safe). */
function hardSplit(text: string, max: number): string[] {
  const pieces: string[] = [];
  let current = '';
  const push = (s: string) => {
    if (s) pieces.push(s);
  };
  for (const word of text.split(/\s+/)) {
    const codePoints = Array.from(word);
    if (codePoints.length > max) {
      push(current);
      current = '';
      for (let i = 0; i < codePoints.length; i += max) push(codePoints.slice(i, i + max).join(''));
    } else if (current && current.length + 1 + word.length > max) {
      push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  push(current);
  return pieces;
}

/** Paragraph -> sentence -> word fallback. Every unit is at most `max` characters. */
export function splitIntoUnits(text: string, max: number): string[] {
  const units: string[] = [];
  for (const paragraph of text.split(/\n{2,}/)) {
    const p = paragraph.trim();
    if (!p) continue;
    if (p.length <= max) {
      units.push(p);
      continue;
    }
    for (const sentence of p.split(/(?<=[.!?])\s+/)) {
      const s = sentence.trim();
      if (!s) continue;
      if (s.length <= max) units.push(s);
      else units.push(...hardSplit(s, max));
    }
  }
  return units;
}

const joinedLength = (units: string[]): number => units.reduce((n, u) => n + u.length, 0) + Math.max(0, units.length - 1);

/**
 * Recursive, boundary-aware chunker: keeps paragraphs and sentences intact where possible,
 * packs them greedily up to the target size, and carries a small overlap into the next chunk.
 */
export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const max = (options.targetTokens ?? 400) * CHARS_PER_TOKEN;
  const overlap = (options.overlapTokens ?? 50) * CHARS_PER_TOKEN;
  const units = splitIntoUnits(text.replace(/\r\n/g, '\n'), max);
  const chunks: string[] = [];
  let current: string[] = [];

  for (const unit of units) {
    if (current.length > 0 && joinedLength(current) + 1 + unit.length > max) {
      chunks.push(current.join('\n'));
      const carry: string[] = [];
      for (let i = current.length - 1; i >= 0; i--) {
        if (joinedLength([current[i], ...carry]) > overlap) break;
        carry.unshift(current[i]);
      }
      current = joinedLength(carry) + 1 + unit.length <= max ? carry : [];
    }
    current.push(unit);
  }
  if (current.length > 0) chunks.push(current.join('\n'));
  return chunks;
}

/** Text sent to the embedding model. The title gives short chunks context; it is not stored or displayed. */
export const embeddingInput = (title: string | null, chunk: string): string => (title ? `Title: ${title}\n\n${chunk}` : chunk);

export const chunkTokenEstimate = estimateTokens;
