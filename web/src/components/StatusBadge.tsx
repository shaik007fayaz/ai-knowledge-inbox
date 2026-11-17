import type { ItemStatus } from '../api/types';

const STYLES: Record<ItemStatus, string> = {
  pending: 'bg-slate-100 text-slate-700',
  processing: 'bg-amber-100 text-amber-800',
  ready: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
};

const LABELS: Record<ItemStatus, string> = {
  pending: 'Queued',
  processing: 'Processing',
  ready: 'Ready',
  failed: 'Failed',
};

export function StatusBadge({ status }: { status: ItemStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>{LABELS[status]}</span>;
}
