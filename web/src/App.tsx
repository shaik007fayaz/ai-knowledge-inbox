import type { ReactNode } from 'react';
import { AddItemForm } from './components/AddItemForm';
import { AnswerCard } from './components/AnswerCard';
import { AskForm } from './components/AskForm';
import { ItemList } from './components/ItemList';
import { useAsk } from './hooks/useAsk';
import { useDeleteItem, useIngest, useItems, useRetryItem } from './hooks/useItems';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50/60 p-5">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default function App() {
  const items = useItems();
  const ingest = useIngest();
  const remove = useDeleteItem();
  const retry = useRetryItem();
  const ask = useAsk();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold">AI Knowledge Inbox</h1>
        <p className="text-sm text-slate-600">Save notes and web pages, then ask questions answered from what you saved.</p>
      </header>

      <Section title="Add">
        <AddItemForm onSubmit={(payload) => ingest.mutateAsync(payload)} pending={ingest.isPending} />
      </Section>

      <Section title="Saved items">
        <ItemList
          items={items.data}
          loading={items.isLoading}
          error={items.error}
          busy={remove.isPending || retry.isPending}
          onDelete={(id) => remove.mutate(id)}
          onRetry={(id) => retry.mutate(id)}
        />
        {(remove.error || retry.error) && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {(remove.error ?? retry.error)?.message}
          </p>
        )}
      </Section>

      <Section title="Ask">
        <AskForm onAsk={(q) => ask.mutate(q)} pending={ask.isPending} />
        {ask.error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {ask.error.message}
          </p>
        )}
        {ask.data && (
          <div className="mt-4">
            <AnswerCard response={ask.data} />
          </div>
        )}
      </Section>
    </main>
  );
}
