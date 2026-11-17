import type { Item } from '../api/types';
import { ItemRow } from './ItemRow';

interface Props {
  items: Item[] | undefined;
  loading: boolean;
  error: Error | null;
  busy: boolean;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
}

export function ItemList({ items, loading, error, busy, onDelete, onRetry }: Props) {
  if (loading) return <p className="text-sm text-slate-500">Loading your items…</p>;
  if (error) return <p role="alert" className="text-sm text-red-700">{error.message}</p>;
  if (!items || items.length === 0) {
    return <p className="text-sm text-slate-500">Nothing saved yet. Add a note or a URL above to get started.</p>;
  }
  return (
    <ul aria-live="polite" className="space-y-2">
      {items.map((item) => (
        <ItemRow key={item.id} item={item} onDelete={onDelete} onRetry={onRetry} busy={busy} />
      ))}
    </ul>
  );
}
