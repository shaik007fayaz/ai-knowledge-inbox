import type { Item } from '../api/types';
import { StatusBadge } from './StatusBadge';

interface Props {
  item: Item;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  busy: boolean;
}

export function ItemRow({ item, onDelete, onRetry, busy }: Props) {
  const heading = item.title ?? item.url ?? 'Untitled';
  return (
    <li className="rounded-md border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{heading}</p>
          <p className="text-xs text-slate-500">
            {item.sourceType === 'url' ? 'URL' : 'Note'} · {new Date(item.createdAt).toLocaleString()}
            {item.status === 'ready' && ` · ${item.chunkCount} chunk${item.chunkCount === 1 ? '' : 's'}`}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </div>

      {item.sourceType === 'url' && item.url && (
        <a href={item.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm text-indigo-700 underline">
          {item.url}
        </a>
      )}
      {item.contentPreview && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.contentPreview}</p>}
      {item.status === 'failed' && item.errorMessage && <p className="mt-1 text-sm text-red-700">{item.errorMessage}</p>}

      <div className="mt-2 flex gap-2">
        {item.status === 'failed' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onRetry(item.id)}
            className="rounded px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
          >
            Retry
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onDelete(item.id)}
          aria-label={`Delete ${heading}`}
          className="rounded px-2 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
