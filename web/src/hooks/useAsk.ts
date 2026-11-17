import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';

export const useAsk = () => useMutation({ mutationFn: (question: string) => api.ask(question) });
