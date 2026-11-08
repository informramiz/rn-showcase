import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { dbKeys, localQueryOptions } from '@/shared/data/queryKeys';
import { useServices } from '@/shared/services/AppServices';

const EMPTY: ReadonlySet<number> = new Set();

/** Stories the user swiped away; hidden from the feeds. */
export function useDismissedIds(): ReadonlySet<number> {
  const { repos } = useServices();
  const { data } = useQuery({
    queryKey: dbKeys.dismissed,
    queryFn: () => repos.dismissed.list(),
    ...localQueryOptions,
  });
  return useMemo(() => (data ? new Set(data) : EMPTY), [data]);
}

export function useDismissStory(): (storyId: number) => void {
  const { repos, now } = useServices();
  const client = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: (storyId: number) => repos.dismissed.dismiss(storyId, now()),
    networkMode: 'always',
    onSettled: () => client.invalidateQueries({ queryKey: dbKeys.dismissed }),
  });
  return mutate;
}
