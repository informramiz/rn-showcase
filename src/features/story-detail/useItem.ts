import { skipToken, useQuery } from '@tanstack/react-query';
import { useServices } from '@/shared/services/AppServices';

export const itemKey = (id: number | undefined) => ['item', id] as const;

/** One item, network first with the local cache as the offline fallback. Skipped without an id. */
export function useItem(id: number | undefined) {
  const { hn } = useServices();
  return useQuery({
    queryKey: itemKey(id),
    queryFn: id === undefined ? skipToken : ({ signal }) => hn.item(id, signal),
  });
}
