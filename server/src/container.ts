import type Database from 'better-sqlite3';
import type { AppConfig } from './config';
import { ChunksRepo } from './db/chunksRepo';
import { openDatabase } from './db/connection';
import { ItemsRepo } from './db/itemsRepo';
import { createLogger, type Logger } from './logger';
import { createEmbeddingProvider, type EmbeddingProvider } from './providers/embedding';
import { createLLMProvider, type LLMProvider } from './providers/llm';
import { IngestService } from './services/ingestService';
import { JobRunner } from './services/jobRunner';
import { RagService } from './services/ragService';
import { RetrievalService } from './services/retrievalService';
import { assertPublicUrl, type UrlGuard } from './services/ssrf';
import { createPageFetcher, type PageFetcher } from './services/urlFetcher';
import { SqliteVectorStore } from './vectorstore/sqliteVectorStore';

export interface Overrides {
  embedder?: EmbeddingProvider;
  llm?: LLMProvider;
  fetchPage?: PageFetcher;
  guardUrl?: UrlGuard;
}

export interface Container {
  config: AppConfig;
  logger: Logger;
  db: Database.Database;
  items: ItemsRepo;
  jobs: JobRunner;
  ingest: IngestService;
  rag: RagService;
  embedder: EmbeddingProvider;
  retrieval: RetrievalService;
}

/** Composition root: the only place that knows which concrete implementations are wired together. */
export function buildContainer(config: AppConfig, overrides: Overrides = {}): Container {
  const logger = createLogger(config.logLevel);
  const db = openDatabase(config.dbPath);
  const items = new ItemsRepo(db);
  const vectorStore = new SqliteVectorStore(new ChunksRepo(db), logger);
  const embedder = overrides.embedder ?? createEmbeddingProvider(config);
  const llm = overrides.llm ?? createLLMProvider(config);
  const guardUrl = overrides.guardUrl ?? assertPublicUrl;
  const fetchPage = overrides.fetchPage ?? createPageFetcher(guardUrl);
  const jobs = new JobRunner(config.jobConcurrency, logger);

  const ingest = new IngestService({
    items,
    vectorStore,
    embedder,
    fetchPage,
    guardUrl,
    jobs,
    logger,
    retry: { attempts: config.retryAttempts, baseDelayMs: config.retryBaseDelayMs },
  });
  const retrieval = new RetrievalService(embedder, vectorStore, config.minScore);
  const rag = new RagService({ items, retrieval, llm, logger });

  return { config, logger, db, items, jobs, ingest, rag, embedder, retrieval };
}
