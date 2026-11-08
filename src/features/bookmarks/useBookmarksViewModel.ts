import { useMemo } from 'react';
import { useOpenStory } from '@/features/history/useOpenStory';
import { useReadIds } from '@/features/history/useReadIds';
import { useBookmarkList, useRemoveBookmark } from './useBookmarks';

export function useBookmarksViewModel() {
  const { data } = useBookmarkList();
  const stories = useMemo(() => data?.map((b) => b.story) ?? [], [data]);
  const readIds = useReadIds();
  const openStory = useOpenStory();
  const remove = useRemoveBookmark();
  return { state: { stories, readIds }, actions: { openStory, remove } };
}
