import { useState, type FormEvent } from 'react';
import type { IngestPayload } from '../api/types';
import { validateInput, type InputMode } from '../validation';

interface Props {
  onSubmit: (payload: IngestPayload) => Promise<unknown>;
  pending: boolean;
}

const TABS: Array<{ mode: InputMode; label: string }> = [
  { mode: 'note', label: 'Note' },
  { mode: 'url', label: 'URL' },
];

export function AddItemForm({ onSubmit, pending }: Props) {
  const [mode, setMode] = useState<InputMode>('note');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: InputMode) {
    setMode(next);
    setValue('');
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateInput(mode, value);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setError(null);
    try {
      await onSubmit(result.payload);
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div role="tablist" aria-label="Type of item" className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.mode}
            type="button"
            role="tab"
            aria-selected={mode === tab.mode}
            onClick={() => switchMode(tab.mode)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              mode === tab.mode ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <label htmlFor="add-input" className="block text-sm font-medium text-slate-700">
        {mode === 'note' ? 'Note' : 'Web page URL'}
      </label>
      {mode === 'note' ? (
        <textarea
          id="add-input"
          rows={4}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
          placeholder="Something you want to remember…"
          aria-invalid={error !== null}
        />
      ) : (
        <input
          id="add-input"
          type="text"
          inputMode="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
          placeholder="https://example.com/article"
          aria-invalid={error !== null}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? 'Saving…' : mode === 'note' ? 'Save note' : 'Save page'}
      </button>
    </form>
  );
}
