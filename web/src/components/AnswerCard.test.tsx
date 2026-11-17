import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { QueryResponse } from '../api/types';
import { AnswerCard } from './AnswerCard';

const response: QueryResponse = {
  answer: 'Paris is the capital of France. [1]',
  sources: [
    { itemId: 'a', chunkId: 'c1', title: 'Geography', url: null, snippet: 'Paris is the capital of France.', score: 0.82, marker: 1, cited: true },
    { itemId: 'b', chunkId: 'c2', title: 'Travel', url: 'https://example.com/trip', snippet: 'Trip notes about Lyon.', score: 0.31, marker: 2, cited: false },
  ],
  meta: { retrievedChunks: 2, latencyMs: { embed: 1, retrieve: 1, generate: 1, total: 5 }, provider: 'mock' },
};

describe('AnswerCard', () => {
  it('renders the answer with cited and additional sources', () => {
    render(<AnswerCard response={response} />);
    expect(screen.getByText('Sources cited')).toBeInTheDocument();
    expect(screen.getByText('Also retrieved')).toBeInTheDocument();
    expect(screen.getByText('Trip notes about Lyon.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://example.com/trip' })).toBeInTheDocument();
  });

  it('highlights the matching source when a citation marker is clicked', () => {
    render(<AnswerCard response={response} />);
    expect(screen.getByTestId('source-1')).toHaveAttribute('data-active', 'false');
    fireEvent.click(screen.getByRole('button', { name: '[1]' }));
    expect(screen.getByTestId('source-1')).toHaveAttribute('data-active', 'true');
  });
});
