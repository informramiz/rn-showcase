import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dbKeys, localQueryOptions } from '@/shared/data/queryKeys';
import type { NoteDraft } from '@/shared/data/ports';
import { useServices } from '@/shared/services/AppServices';

export function useNotes(storyId: number) {
  const { repos } = useServices();
  return useQuery({
    queryKey: dbKeys.notes(storyId),
    queryFn: () => repos.notes.listForStory(storyId),
    ...localQueryOptions,
  });
}

/** Local write first, then refresh local reads and wake the sync engine. */
function useNoteMutation<T>(write: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  const { sync } = useServices();
  return useMutation({
    mutationFn: write,
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: dbKeys.allNotes }),
        client.invalidateQueries({ queryKey: dbKeys.outbox }),
      ]);
      sync.kick();
    },
  });
}

export function useSaveNote() {
  const { repos, now } = useServices();
  return useNoteMutation((draft: NoteDraft) => repos.notes.save(draft, now())).mutateAsync;
}

export function useDeleteNote() {
  const { repos, now } = useServices();
  return useNoteMutation((id: string) => repos.notes.remove(id, now())).mutateAsync;
}
