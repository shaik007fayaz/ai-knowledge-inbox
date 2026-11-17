import type { IngestPayload, Item, QueryResponse } from './types';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function friendlyMessage(status: number, serverMessage?: string): string {
  if (status === 429) return 'Too many requests. Wait a moment and try again.';
  if (status === 502 || status === 504) return 'The AI service is not responding right now. Try again in a moment.';
  if (status >= 500) return 'Something went wrong on the server. Try again.';
  return serverMessage ?? 'The request failed.';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...init.headers } });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check that it is running (npm run dev).');
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null;
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? 'UNKNOWN', friendlyMessage(res.status, body?.error?.message), body?.error?.details);
  }
  return body as T;
}

export const api = {
  listItems: async (): Promise<Item[]> => (await request<{ items: Item[] }>('/items?limit=100')).items,
  ingest: (payload: IngestPayload) => request<{ id: string; status: string }>('/ingest', { method: 'POST', body: JSON.stringify(payload) }),
  deleteItem: (id: string) => request<void>(`/items/${id}`, { method: 'DELETE' }),
  retryItem: (id: string) => request<{ id: string }>(`/items/${id}/retry`, { method: 'POST' }),
  ask: (question: string) => request<QueryResponse>('/query', { method: 'POST', body: JSON.stringify({ question }) }),
};
