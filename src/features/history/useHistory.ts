import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { StorySummary } from '@/shared/api';
import { dbKeys, localQueryOptions } from '@/shared/data/queryKeys';
import { useServices } from '@/shared/services/AppServices';

/** Reading history, most recent first, read from the local store. */
export function useHistoryList() {
  const { repos } = useServices();
  return useQuery({ queryKey: dbKeys.history, queryFn: () => repos.history.list(), ...localQueryOptions });
}

export function useMarkRead(): (story: StorySummary) => void {
  const { repos, now } = useServices();
  const client = useQueryClient();
  const { mutate } = useMutation({
    mutationFn: (story: StorySummary) => repos.history.markRead(story, now()),
    networkMode: 'always',
    onSettled: () => client.invalidateQueries({ queryKey: dbKeys.history }),
  });
  return useCallback((story) => mutate(story), [mutate]);
}

export function useClearHistory(): () => Promise<void> {
  const { repos } = useServices();
  const client = useQueryClient();
  return useCallback(async () => {
    await repos.history.clear();
    await client.invalidateQueries({ queryKey: dbKeys.history });
  }, [repos, client]);
}
