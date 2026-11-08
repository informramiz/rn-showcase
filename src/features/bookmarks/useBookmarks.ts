import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { StorySummary } from '@/shared/api';
import { dbKeys, localQueryOptions } from '@/shared/data/queryKeys';
import { useServices } from '@/shared/services/AppServices';

/** Saved stories, newest first, read from the local store. */
export function useBookmarkList() {
  const { repos } = useServices();
  return useQuery({
    queryKey: dbKeys.bookmarks,
    queryFn: () => repos.bookmarks.list(),
    ...localQueryOptions,
  });
}

export function useIsBookmarked(id: number): boolean {
  return useBookmarkList().data?.some((b) => b.story.id === id) ?? false;
}

function useInvalidateBookmarks() {
  const client = useQueryClient();
  return useCallback(async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: dbKeys.bookmarks }),
      // "Saved" search results depend on bookmarks.
      client.invalidateQueries({ queryKey: dbKeys.search }),
    ]);
  }, [client]);
}

export function useToggleBookmark(): (story: StorySummary) => void {
  const { repos, now } = useServices();
  const onSettled = useInvalidateBookmarks();
  const { mutate } = useMutation({
    mutationFn: (story: StorySummary) => repos.bookmarks.toggle(story, now()),
    networkMode: 'always',
    onSettled,
  });
  return mutate;
}

export function useRemoveBookmark(): (storyId: number) => void {
  const { repos } = useServices();
  const onSettled = useInvalidateBookmarks();
  const { mutate } = useMutation({
    mutationFn: (storyId: number) => repos.bookmarks.remove(storyId),
    networkMode: 'always',
    onSettled,
  });
  return mutate;
}

export function useClearBookmarks(): () => void {
  const { repos } = useServices();
  const onSettled = useInvalidateBookmarks();
  const { mutate } = useMutation({
    mutationFn: () => repos.bookmarks.clear(),
    networkMode: 'always',
    onSettled,
  });
  return useCallback(() => {
    mutate();
  }, [mutate]);
}
