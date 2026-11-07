import { useQuery } from '@tanstack/react-query';
import { fetchItem } from '@/shared/api';

export const itemKey = (id: number) => ['item', id] as const;

export function useItem(id: number) {
  return useQuery({ queryKey: itemKey(id), queryFn: ({ signal }) => fetchItem(id, signal) });
}
