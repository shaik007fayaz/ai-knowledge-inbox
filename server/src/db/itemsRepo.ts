import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

export type ItemStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type SourceType = 'note' | 'url';

export interface ItemRow {
  id: string;
  source_type: SourceType;
  title: string | null;
  url: string | null;
  raw_content: string;
  status: ItemStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ItemWithCount extends ItemRow {
  chunk_count: number;
}

export interface NewItem {
  sourceType: SourceType;
  title: string | null;
  url: string | null;
  rawContent: string;
}

const WITH_COUNT = `SELECT i.*, (SELECT COUNT(*) FROM chunks c WHERE c.item_id = i.id) AS chunk_count FROM items i`;

export class ItemsRepo {
  constructor(private readonly db: Database.Database) {}

  create(input: NewItem): ItemRow {
    const now = new Date().toISOString();
    const row: ItemRow = {
      id: randomUUID(),
      source_type: input.sourceType,
      title: input.title,
      url: input.url,
      raw_content: input.rawContent,
      status: 'pending',
      error_message: null,
      created_at: now,
      updated_at: now,
    };
    this.db
      .prepare(
        `INSERT INTO items (id, source_type, title, url, raw_content, status, error_message, created_at, updated_at)
         VALUES (@id, @source_type, @title, @url, @raw_content, @status, @error_message, @created_at, @updated_at)`,
      )
      .run(row);
    return row;
  }

  get(id: string): ItemRow | undefined {
    return this.db.prepare('SELECT * FROM items WHERE id = ?').get(id) as ItemRow | undefined;
  }

  getWithCount(id: string): ItemWithCount | undefined {
    return this.db.prepare(`${WITH_COUNT} WHERE i.id = ?`).get(id) as ItemWithCount | undefined;
  }

  list(limit: number, offset: number): ItemWithCount[] {
    return this.db
      .prepare(`${WITH_COUNT} ORDER BY i.created_at DESC, i.rowid DESC LIMIT ? OFFSET ?`)
      .all(limit, offset) as ItemWithCount[];
  }

  total(): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM items').get() as { n: number }).n;
  }

  findByUrl(url: string): ItemRow | undefined {
    return this.db.prepare('SELECT * FROM items WHERE url = ?').get(url) as ItemRow | undefined;
  }

  listByStatus(statuses: ItemStatus[]): ItemRow[] {
    const marks = statuses.map(() => '?').join(',');
    return this.db
      .prepare(`SELECT * FROM items WHERE status IN (${marks}) ORDER BY created_at`)
      .all(...statuses) as ItemRow[];
  }

  countByStatus(status: ItemStatus): number {
    return (this.db.prepare('SELECT COUNT(*) AS n FROM items WHERE status = ?').get(status) as { n: number }).n;
  }

  setStatus(id: string, status: ItemStatus, errorMessage: string | null = null): void {
    this.db
      .prepare('UPDATE items SET status = ?, error_message = ?, updated_at = ? WHERE id = ?')
      .run(status, errorMessage, new Date().toISOString(), id);
  }

  setFetched(id: string, title: string | null, rawContent: string): void {
    this.db
      .prepare('UPDATE items SET title = ?, raw_content = ?, updated_at = ? WHERE id = ?')
      .run(title, rawContent, new Date().toISOString(), id);
  }

  delete(id: string): boolean {
    return this.db.prepare('DELETE FROM items WHERE id = ?').run(id).changes > 0;
  }
}
