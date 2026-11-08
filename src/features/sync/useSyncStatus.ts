import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { dbKeys, localQueryOptions } from '@/shared/data/queryKeys';
import { useServices } from '@/shared/services/AppServices';
import { summarize } from '@/shared/sync/outbox';

/** Refresh local note/outbox reads whenever the sync engine finishes a run. Mount once. */
export function useSyncEvents(): void {
  const client = useQueryClient();
  const { sync } = useServices();
  useEffect(
    () =>
      sync.subscribe(() => {
        void client.invalidateQueries({ queryKey: dbKeys.allNotes });
        void client.invalidateQueries({ queryKey: dbKeys.outbox });
      }),
    [client, sync],
  );
}

/** Pending/failed counts plus the manual controls shown in Settings. */
export function useSyncStatus() {
  const { repos, sync, network } = useServices();
  const [flaky, setFlakyState] = useState(() => network.isFlaky());
  const { data: status = { pending: 0, failed: 0 } } = useQuery({
    queryKey: dbKeys.outbox,
    queryFn: async () => summarize(await repos.outbox.list()),
    ...localQueryOptions,
  });
  const syncNow = useMutation({ mutationFn: () => sync.syncNow() });
  const retryFailed = useMutation({ mutationFn: () => sync.retryFailed() });

  return {
    status,
    syncing: syncNow.isPending || retryFailed.isPending,
    flaky,
    syncNow: () => syncNow.mutate(),
    retryFailed: () => retryFailed.mutate(),
    setFlaky: (value: boolean) => {
      network.setFlaky(value);
      setFlakyState(value);
    },
  };
}
