export type ItemStatus = 'pending' | 'processing' | 'ready' | 'failed';

export interface Item {
  id: string;
  sourceType: 'note' | 'url';
  title: string | null;
  url: string | null;
  status: ItemStatus;
  errorMessage: string | null;
  createdAt: string;
  contentPreview: string;
  chunkCount: number;
}

export type IngestPayload =
  | { type: 'note'; content: string; title?: string }
  | { type: 'url'; url: string; title?: string };

export interface Source {
  itemId: string;
  chunkId: string;
  title: string | null;
  url: string | null;
  snippet: string;
  score: number;
  marker: number;
  cited: boolean;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
  meta: {
    retrievedChunks: number;
    latencyMs: { embed: number; retrieve: number; generate: number; total: number };
    provider: string;
  };
}
