import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddItemForm } from './AddItemForm';

const setup = () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<AddItemForm onSubmit={onSubmit} pending={false} />);
  return onSubmit;
};

describe('AddItemForm', () => {
  it('shows an error and does not submit an empty note', () => {
    const onSubmit = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Write something');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a URL without http(s)', () => {
    const onSubmit = setup();
    fireEvent.click(screen.getByRole('tab', { name: 'URL' }));
    fireEvent.change(screen.getByLabelText('Web page URL'), { target: { value: 'example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save page' }));
    expect(screen.getByRole('alert')).toHaveTextContent('http://');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a valid note and clears the field', async () => {
    const onSubmit = setup();
    const field = screen.getByLabelText('Note');
    fireEvent.change(field, { target: { value: '  Buy oat milk  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ type: 'note', content: 'Buy oat milk' }));
    await waitFor(() => expect(field).toHaveValue(''));
  });

  it('shows the server error message when saving fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('That URL is already saved'));
    render(<AddItemForm onSubmit={onSubmit} pending={false} />);
    fireEvent.click(screen.getByRole('tab', { name: 'URL' }));
    fireEvent.change(screen.getByLabelText('Web page URL'), { target: { value: 'https://example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save page' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already saved');
  });
});
