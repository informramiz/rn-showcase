import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchItem } from '../api';

export const itemKey = (id: number) => ['item', id] as const;

export function useItem(id: number) {
  return useQuery({ queryKey: itemKey(id), queryFn: ({ signal }) => fetchItem(id, signal) });
}

/** Imperative loader used by the comment tree. Shares the cache with useItem. */
export function useItemLoader() {
  const client = useQueryClient();
  return (id: number) =>
    client.fetchQuery({
      queryKey: itemKey(id),
      queryFn: ({ signal }) => fetchItem(id, signal),
      staleTime: 5 * 60_000,
    });
}
