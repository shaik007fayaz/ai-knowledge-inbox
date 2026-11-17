import { useState } from 'react';
import type { QueryResponse } from '../api/types';
import { SourceSnippet } from './SourceSnippet';

/** Splits "text [1] more [2]" into plain text and clickable citation markers. */
function renderAnswer(answer: string, onMarker: (n: number) => void) {
  return answer.split(/(\[\d+\])/g).map((part, i) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (!match) return <span key={i}>{part}</span>;
    return (
      <button
        key={i}
        type="button"
        onClick={() => onMarker(Number(match[1]))}
        className="mx-0.5 rounded bg-indigo-100 px-1 text-xs font-semibold text-indigo-800 hover:bg-indigo-200"
      >
        {part}
      </button>
    );
  });
}

export function AnswerCard({ response }: { response: QueryResponse }) {
  const [active, setActive] = useState<number | null>(null);
  const cited = response.sources.filter((s) => s.cited);
  const others = response.sources.filter((s) => !s.cited);

  const select = (marker: number) => {
    setActive(marker);
    document.getElementById(`source-${marker}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div aria-live="polite" className="space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-4">
        <p className="whitespace-pre-wrap leading-relaxed">{renderAnswer(response.answer, select)}</p>
        <p className="mt-3 text-xs text-slate-500">
          {response.meta.latencyMs.total} ms · {response.meta.provider} provider
        </p>
      </div>

      {cited.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">Sources cited</h3>
          <ul className="space-y-2">
            {cited.map((s) => (
              <SourceSnippet key={s.chunkId} source={s} active={active === s.marker} />
            ))}
          </ul>
        </section>
      )}
      {others.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">{cited.length > 0 ? 'Also retrieved' : 'Retrieved sources'}</h3>
          <ul className="space-y-2">
            {others.map((s) => (
              <SourceSnippet key={s.chunkId} source={s} active={active === s.marker} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
