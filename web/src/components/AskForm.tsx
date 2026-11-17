import { useState, type FormEvent } from 'react';

interface Props {
  onAsk: (question: string) => void;
  pending: boolean;
}

export function AskForm({ onAsk, pending }: Props) {
  const [question, setQuestion] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = question.trim();
    if (q.length < 3) {
      setError('Ask a question with at least 3 characters.');
      return;
    }
    setError(null);
    onAsk(q);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <label htmlFor="question" className="block text-sm font-medium text-slate-700">
        Question
      </label>
      <textarea
        id="question"
        rows={2}
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm"
        placeholder="What did I save about…?"
      />
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
        {pending ? 'Thinking…' : 'Ask'}
      </button>
    </form>
  );
}
