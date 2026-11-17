import type { IngestPayload } from './api/types';

export type InputMode = 'note' | 'url';

const MAX_NOTE = 20_000;

/** Mirrors the server's Zod rules so most mistakes are caught before a request is sent. */
export function validateInput(mode: InputMode, raw: string): { error: string } | { payload: IngestPayload } {
  const value = raw.trim();
  if (mode === 'note') {
    if (!value) return { error: 'Write something before saving.' };
    if (value.length > MAX_NOTE) return { error: `Notes can be up to ${MAX_NOTE.toLocaleString()} characters.` };
    return { payload: { type: 'note', content: value } };
  }
  if (!value) return { error: 'Paste a URL before saving.' };
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('protocol');
  } catch {
    return { error: 'Enter a full URL that starts with http:// or https://.' };
  }
  return { payload: { type: 'url', url: value } };
}
