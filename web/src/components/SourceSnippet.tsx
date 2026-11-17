import type { Source } from '../api/types';

export function SourceSnippet({ source, active }: { source: Source; active: boolean }) {
  return (
    <li
      id={`source-${source.marker}`}
      data-testid={`source-${source.marker}`}
      data-active={active}
      className={`rounded-md border p-3 text-sm ${active ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white'}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-medium">
          [{source.marker}] {source.title ?? 'Untitled'}
        </p>
        <span className="shrink-0 text-xs text-slate-500">relevance {source.score.toFixed(2)}</span>
      </div>
      {source.url && (
        <a href={source.url} target="_blank" rel="noreferrer" className="block truncate text-xs text-indigo-700 underline">
          {source.url}
        </a>
      )}
      <p className="mt-1 text-slate-700">{source.snippet}</p>
    </li>
  );
}
