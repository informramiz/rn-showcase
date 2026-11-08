import { useCallback, useMemo, useState } from 'react';
import { useOpenStory } from '@/features/history/useOpenStory';
import { useReadIds } from '@/features/history/useReadIds';
import { FEEDS, toSummary, type FeedKind } from '@/shared/api';
import { useBookmarkList, useToggleBookmark } from '@/features/bookmarks/useBookmarks';
import { strings } from '@/shared/i18n/strings';
import type { SwipeActions } from '@/shared/ui/SwipeableStoryRow';
import { useDismissedIds, useDismissStory } from './useDismissed';
import { useStories } from './useStories';

/** Stories screen: selected feed (client state) over the paginated feed query (server state). */
export function useStoriesViewModel() {
  const [feed, setFeed] = useState<FeedKind>('top');
  const q = useStories(feed);
  const readIds = useReadIds();
  const openStory = useOpenStory();
  const dismissed = useDismissedIds();
  const stories = useMemo(
    () => q.stories.filter((s) => !dismissed.has(s.id)).map(toSummary),
    [q.stories, dismissed],
  );
  const { data: bookmarks } = useBookmarkList();
  const toggleBookmark = useToggleBookmark();
  const dismiss = useDismissStory();
  const swipe = useMemo<SwipeActions>(() => {
    const saved = new Set(bookmarks?.map((b) => b.story.id));
    return {
      onBookmark: toggleBookmark,
      onDismiss: (story) => dismiss(story.id),
      bookmarkLabel: (story) => (saved.has(story.id) ? strings.swipe.unsave : strings.swipe.save),
      dismissLabel: strings.swipe.dismiss,
    };
  }, [bookmarks, toggleBookmark, dismiss]);

  const { refetch, refresh, fetchNextPage, hasNextPage, isFetchingNextPage } = q;
  const retry = useCallback(() => void refetch(), [refetch]);
  const onRefresh = useCallback(() => void refresh(), [refresh]);
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    state: {
      feeds: FEEDS,
      feed,
      stories,
      readIds,
      isPending: q.isPending,
      showError: q.isError && q.stories.length === 0,
      error: q.error,
      refreshing: q.refreshing,
      loadingMore: isFetchingNextPage,
      swipe,
    },
    actions: { selectFeed: setFeed, retry, refresh: onRefresh, loadMore, openStory },
  };
}
