import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { UnprocessableError } from '../src/errors';
import { NOT_FOUND_ANSWER, NO_ITEMS_ANSWER } from '../src/services/ragService';
import { createTestApp } from './helpers';

const PARIS = 'Paris is the capital of France. It is known for the Eiffel Tower.';
const RUST = 'Rust is a systems programming language focused on memory safety.';

const LONG_PAGE = {
  title: 'Example Page',
  text: 'Quarterly revenue grew twelve percent thanks to the new subscription tier launched in March.',
};

async function addNote(app: ReturnType<typeof createTestApp>['app'], content: string) {
  return request(app).post('/ingest').send({ type: 'note', content });
}

describe('GET /health', () => {
  it('reports status and echoes the request id', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/health').set('x-request-id', 'abc-123');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', db: 'ok', provider: 'mock' });
    expect(res.headers['x-request-id']).toBe('abc-123');
  });
});

describe('POST /ingest + GET /items', () => {
  it('accepts a note with 202, processes it in the background and lists it as ready', async () => {
    const { app, container } = createTestApp();
    const res = await addNote(app, PARIS);
    expect(res.status).toBe(202);
    expect(res.body.status).toBe('pending');

    await container.jobs.drain();
    const list = await request(app).get('/items');
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({ id: res.body.id, sourceType: 'note', status: 'ready', chunkCount: 1 });
    expect(list.body.items[0].contentPreview).toContain('Paris');
  });

  it('rejects invalid payloads with a consistent 400 error shape', async () => {
    const { app } = createTestApp();
    for (const body of [{}, { type: 'note', content: '   ' }, { type: 'url', url: 'not a url' }, { type: 'url', url: 'ftp://x.com/a' }]) {
      const res = await request(app).post('/ingest').send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(typeof res.body.error.message).toBe('string');
    }
  });

  it('returns 400 for malformed JSON and 413 for oversized bodies', async () => {
    const { app } = createTestApp();
    const bad = await request(app).post('/ingest').set('Content-Type', 'application/json').send('{oops');
    expect(bad.status).toBe(400);
    const big = await request(app).post('/ingest').send({ type: 'note', content: 'x'.repeat(300_000) });
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('rejects private URLs with 422 before creating an item', async () => {
    const { app } = createTestApp();
    const res = await request(app).post('/ingest').send({ type: 'url', url: 'http://127.0.0.1:3000/secret' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('BLOCKED_URL');
    expect((await request(app).get('/items')).body.total).toBe(0);
  });

  it('ingests a URL via the page fetcher and rejects the same URL twice with 409', async () => {
    const { app, container } = createTestApp({ guardUrl: async () => undefined, fetchPage: async () => LONG_PAGE });
    const first = await request(app).post('/ingest').send({ type: 'url', url: 'https://example.com/report' });
    expect(first.status).toBe(202);
    await container.jobs.drain();

    const item = await request(app).get(`/items/${first.body.id}`);
    expect(item.body).toMatchObject({ status: 'ready', title: 'Example Page', sourceType: 'url' });
    expect(item.body.rawContent).toContain('Quarterly revenue');

    const dup = await request(app).post('/ingest').send({ type: 'url', url: 'https://example.com/report' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('DUPLICATE_URL');
    expect(dup.body.error.details.existingId).toBe(first.body.id);
  });

  it('marks an item failed with a readable message, and lets the user retry it', async () => {
    let attempts = 0;
    const { app, container } = createTestApp({
      guardUrl: async () => undefined,
      fetchPage: async () => {
        attempts++;
        if (attempts === 1) throw new UnprocessableError('No readable text was found on that page', 'NO_READABLE_CONTENT');
        return LONG_PAGE;
      },
    });
    const created = await request(app).post('/ingest').send({ type: 'url', url: 'https://example.com/empty' });
    await container.jobs.drain();

    const failed = await request(app).get(`/items/${created.body.id}`);
    expect(failed.body.status).toBe('failed');
    expect(failed.body.errorMessage).toBe('No readable text was found on that page');

    const retry = await request(app).post(`/items/${created.body.id}/retry`);
    expect(retry.status).toBe(202);
    await container.jobs.drain();
    expect((await request(app).get(`/items/${created.body.id}`)).body.status).toBe('ready');

    const again = await request(app).post(`/items/${created.body.id}/retry`);
    expect(again.status).toBe(409);
  });

  it('deletes items (204) and then returns 404', async () => {
    const { app, container } = createTestApp();
    const { body } = await addNote(app, PARIS);
    await container.jobs.drain();
    expect((await request(app).delete(`/items/${body.id}`)).status).toBe(204);
    expect((await request(app).get(`/items/${body.id}`)).status).toBe(404);
    expect((await request(app).delete(`/items/${body.id}`)).status).toBe(404);
  });

  it('re-queues items left pending by a previous run', async () => {
    const { app, container } = createTestApp();
    container.items.create({ sourceType: 'note', title: 'Left over', url: null, rawContent: PARIS });
    expect(container.ingest.recoverPending()).toBe(1);
    await container.jobs.drain();
    expect((await request(app).get('/items')).body.items[0].status).toBe('ready');
  });
});

describe('POST /query', () => {
  it('answers from saved notes with cited sources', async () => {
    const { app, container } = createTestApp();
    await addNote(app, PARIS);
    await addNote(app, RUST);
    await container.jobs.drain();

    const res = await request(app).post('/query').send({ question: 'What is the capital of France?' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toContain('Paris is the capital of France');
    expect(res.body.answer).toContain('[1]');
    expect(res.body.sources[0]).toMatchObject({ marker: 1, cited: true });
    expect(res.body.sources[0].snippet).toContain('Paris');
    expect(res.body.sources.some((s: { snippet: string }) => s.snippet.includes('Rust'))).toBe(false);
    expect(res.body.meta.latencyMs.total).toBeGreaterThanOrEqual(0);
    expect(res.body.meta.provider).toBe('mock');
  });

  it("says it couldn't find an answer when nothing is relevant, without calling the LLM", async () => {
    let llmCalls = 0;
    const { app, container } = createTestApp({
      llm: { name: 'mock', generate: async () => (llmCalls++, { text: 'should not be used' }) },
    });
    await addNote(app, PARIS);
    await container.jobs.drain();

    const res = await request(app).post('/query').send({ question: 'Explain quantum chromodynamics' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe(NOT_FOUND_ANSWER);
    expect(res.body.sources).toEqual([]);
    expect(llmCalls).toBe(0);
  });

  it('returns a friendly 200 when nothing has been saved yet', async () => {
    const { app } = createTestApp();
    const res = await request(app).post('/query').send({ question: 'Anything saved?' });
    expect(res.status).toBe(200);
    expect(res.body.answer).toBe(NO_ITEMS_ANSWER);
    expect(res.body.sources).toEqual([]);
  });

  it('validates the question and topK', async () => {
    const { app } = createTestApp();
    expect((await request(app).post('/query').send({ question: 'hi' })).status).toBe(400);
    expect((await request(app).post('/query').send({ question: 'valid question', topK: 50 })).status).toBe(400);
  });

  it('maps an upstream LLM failure to 502 without leaking details', async () => {
    const { UpstreamError } = await import('../src/errors');
    const { app, container } = createTestApp({
      llm: { name: 'openai', generate: async () => { throw new UpstreamError('The AI provider returned HTTP 500'); } },
    });
    await addNote(app, PARIS);
    await container.jobs.drain();
    const res = await request(app).post('/query').send({ question: 'capital of France' });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
  });

  it('rate limits excessive requests with 429', async () => {
    const { createApp } = await import('../src/app');
    const { loadConfig } = await import('../src/config');
    const { buildContainer } = await import('../src/container');
    const config = loadConfig({}, { dbPath: ':memory:', logLevel: 'silent', provider: 'mock', rateLimitMax: 2 });
    const app = createApp(buildContainer(config));
    const statuses: number[] = [];
    for (let i = 0; i < 3; i++) statuses.push((await request(app).post('/query').send({ question: 'anything' })).status);
    expect(statuses).toEqual([200, 200, 429]);
  });
});

describe('unknown routes', () => {
  it('return the standard 404 error shape', async () => {
    const { app } = createTestApp();
    const res = await request(app).get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
