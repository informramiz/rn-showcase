import { useQuery } from '@tanstack/react-query';
import { useServices } from '@/shared/services/AppServices';

export const itemKey = (id: number) => ['item', id] as const;

/** One item, network first with the local cache as the offline fallback. */
export function useItem(id: number) {
  const { hn } = useServices();
  return useQuery({ queryKey: itemKey(id), queryFn: ({ signal }) => hn.item(id, signal) });
}
