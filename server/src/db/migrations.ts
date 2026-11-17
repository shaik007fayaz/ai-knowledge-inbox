import type Database from 'better-sqlite3';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS items (
  id            TEXT PRIMARY KEY,
  source_type   TEXT NOT NULL CHECK (source_type IN ('note', 'url')),
  title         TEXT,
  url           TEXT,
  raw_content   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  error_message TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_url ON items(url) WHERE url IS NOT NULL;

CREATE TABLE IF NOT EXISTS chunks (
  id              TEXT PRIMARY KEY,
  item_id         TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  chunk_index     INTEGER NOT NULL,
  content         TEXT NOT NULL,
  token_estimate  INTEGER NOT NULL,
  embedding       BLOB NOT NULL,
  embedding_model TEXT NOT NULL,
  created_at      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chunks_item ON chunks(item_id);
`;

export function runMigrations(db: Database.Database): void {
  db.exec(SCHEMA);
}
