import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import type { IngestPayload } from '../api/types';

export const itemsKey = ['items'] as const;

/** Polls every 2s only while something is still being processed; otherwise stays idle. */
export function useItems() {
  return useQuery({
    queryKey: itemsKey,
    queryFn: api.listItems,
    refetchInterval: (query) =>
      query.state.data?.some((i) => i.status === 'pending' || i.status === 'processing') ? 2000 : false,
  });
}

function useItemMutation<TVars>(mutationFn: (vars: TVars) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries({ queryKey: itemsKey }) });
}

export const useIngest = () => useItemMutation((payload: IngestPayload) => api.ingest(payload));
export const useDeleteItem = () => useItemMutation((id: string) => api.deleteItem(id));
export const useRetryItem = () => useItemMutation((id: string) => api.retryItem(id));
