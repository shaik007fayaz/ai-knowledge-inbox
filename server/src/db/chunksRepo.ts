import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';

export interface ChunkInsert {
  content: string;
  tokenEstimate: number;
  embedding: Float32Array;
}

export interface ChunkRecord {
  id: string;
  itemId: string;
  content: string;
  embedding: Float32Array;
  embeddingModel: string;
  title: string | null;
  url: string | null;
}

interface ChunkJoinRow {
  id: string;
  item_id: string;
  content: string;
  embedding: Buffer;
  embedding_model: string;
  title: string | null;
  url: string | null;
}

const toBlob = (v: Float32Array): Buffer => Buffer.from(v.buffer, v.byteOffset, v.byteLength);
const fromBlob = (b: Buffer): Float32Array =>
  new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

export class ChunksRepo {
  constructor(private readonly db: Database.Database) {}

  /** Idempotent: deletes any previous chunks of the item and inserts the new set atomically. */
  replaceForItem(itemId: string, model: string, chunks: ChunkInsert[]): void {
    const insert = this.db.prepare(
      `INSERT INTO chunks (id, item_id, chunk_index, content, token_estimate, embedding, embedding_model, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM chunks WHERE item_id = ?').run(itemId);
      chunks.forEach((c, i) =>
        insert.run(randomUUID(), itemId, i, c.content, c.tokenEstimate, toBlob(c.embedding), model, now),
      );
    })();
  }

  /** All chunks with their item metadata. Brute-force search scans this; see README for scale notes. */
  allWithMeta(): ChunkRecord[] {
    const rows = this.db
      .prepare(
        `SELECT c.id, c.item_id, c.content, c.embedding, c.embedding_model, i.title, i.url
         FROM chunks c JOIN items i ON i.id = c.item_id`,
      )
      .all() as ChunkJoinRow[];
    return rows.map((r) => ({
      id: r.id,
      itemId: r.item_id,
      content: r.content,
      embedding: fromBlob(r.embedding),
      embeddingModel: r.embedding_model,
      title: r.title,
      url: r.url,
    }));
  }
}
