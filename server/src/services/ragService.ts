import type { ItemsRepo } from '../db/itemsRepo';
import type { Logger } from '../logger';
import type { LLMProvider } from '../providers/llm';
import { truncate } from '../utils/text';
import { buildUserPrompt, fitToBudget, parseCitations, SYSTEM_PROMPT, toPassages } from './prompt';
import type { RetrievalService } from './retrievalService';

export const NO_ITEMS_ANSWER = "You haven't saved anything searchable yet. Add a note or URL first, then ask again.";
export const NOT_FOUND_ANSWER = "I couldn't find that in your saved content.";

const CONTEXT_CHAR_BUDGET = 12_000;
const SNIPPET_CHARS = 400;

export interface QuerySource {
  itemId: string;
  chunkId: string;
  title: string | null;
  url: string | null;
  snippet: string;
  score: number;
  marker: number;
  /** True when the answer text cites this source; false for "also retrieved". */
  cited: boolean;
}

export interface QueryResult {
  answer: string;
  sources: QuerySource[];
  meta: {
    retrievedChunks: number;
    latencyMs: { embed: number; retrieve: number; generate: number; total: number };
    provider: string;
  };
}

export class RagService {
  constructor(
    private readonly deps: { items: ItemsRepo; retrieval: RetrievalService; llm: LLMProvider; logger: Logger },
  ) {}

  async answer(question: string, topK: number, log: Logger = this.deps.logger): Promise<QueryResult> {
    const started = performance.now();
    const provider = this.deps.llm.name;
    const done = (answer: string, sources: QuerySource[], embed = 0, retrieve = 0, generate = 0): QueryResult => ({
      answer,
      sources,
      meta: {
        retrievedChunks: sources.length,
        latencyMs: { embed, retrieve, generate, total: Math.round(performance.now() - started) },
        provider,
      },
    });

    if (this.deps.items.countByStatus('ready') === 0) return done(NO_ITEMS_ANSWER, []);

    const { hits, embedMs, retrieveMs } = await this.deps.retrieval.retrieve(question, topK);
    if (hits.length === 0) {
      log.info({ questionChars: question.length, embedMs, retrieveMs }, 'No chunk above threshold; LLM skipped');
      return done(NOT_FOUND_ANSWER, [], embedMs, retrieveMs);
    }

    const context = fitToBudget(hits, CONTEXT_CHAR_BUDGET);
    const passages = toPassages(context);
    const g0 = performance.now();
    const output = await this.deps.llm.generate({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt(question, passages),
      question,
      context: passages,
    });
    const generateMs = Math.round(performance.now() - g0);

    const cited = parseCitations(output.text, context.length);
    const sources: QuerySource[] = context
      .map((hit, i) => ({
        itemId: hit.itemId,
        chunkId: hit.chunkId,
        title: hit.title,
        url: hit.url,
        snippet: truncate(hit.content, SNIPPET_CHARS),
        score: Math.round(hit.score * 1000) / 1000,
        marker: i + 1,
        cited: cited.has(i + 1),
      }))
      .sort((a, b) => Number(b.cited) - Number(a.cited) || a.marker - b.marker);

    log.info(
      {
        questionChars: question.length,
        retrieved: hits.length,
        scores: hits.map((h) => Math.round(h.score * 100) / 100),
        cited: [...cited],
        embedMs,
        retrieveMs,
        generateMs,
        usage: output.usage,
        provider,
      },
      'Answered question',
    );
    return done(output.text, sources, embedMs, retrieveMs, generateMs);
  }
}
