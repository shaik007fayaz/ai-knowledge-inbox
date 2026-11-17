import type { ItemWithCount } from '../db/itemsRepo';
import { truncate } from '../utils/text';

export function toItemDto(row: ItemWithCount) {
  return {
    id: row.id,
    sourceType: row.source_type,
    title: row.title,
    url: row.url,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    contentPreview: truncate(row.raw_content, 200),
    chunkCount: row.chunk_count,
  };
}

export const toItemDetailDto = (row: ItemWithCount) => ({ ...toItemDto(row), rawContent: row.raw_content });
