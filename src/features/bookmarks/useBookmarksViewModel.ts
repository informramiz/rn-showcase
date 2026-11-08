import { useMemo } from 'react';
import { useOpenStory } from '@/features/history/useOpenStory';
import { useReadIds } from '@/features/history/useReadIds';
import { strings } from '@/shared/i18n/strings';
import type { SwipeActions } from '@/shared/ui/SwipeableStoryRow';
import { useBookmarkList, useRemoveBookmark } from './useBookmarks';

export function useBookmarksViewModel() {
  const { data } = useBookmarkList();
  const stories = useMemo(() => data?.map((b) => b.story) ?? [], [data]);
  const readIds = useReadIds();
  const openStory = useOpenStory();
  const remove = useRemoveBookmark();
  // On the saved list, swiping a row away removes the bookmark.
  const swipe = useMemo<SwipeActions>(
    () => ({ onDismiss: (story) => remove(story.id), dismissLabel: strings.swipe.remove }),
    [remove],
  );
  return { state: { stories, readIds, swipe }, actions: { openStory, remove } };
}
