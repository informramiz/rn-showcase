import { useCallback, useMemo, useState } from 'react';
import { useOpenStory } from '@/features/history/useOpenStory';
import { useReadIds } from '@/features/history/useReadIds';
import { FEEDS, toSummary, type FeedKind } from '@/shared/api';
import { useStories } from './useStories';

/** Stories screen: selected feed (client state) over the paginated feed query (server state). */
export function useStoriesViewModel() {
  const [feed, setFeed] = useState<FeedKind>('top');
  const q = useStories(feed);
  const readIds = useReadIds();
  const openStory = useOpenStory();
  const stories = useMemo(() => q.stories.map(toSummary), [q.stories]);

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
    },
    actions: { selectFeed: setFeed, retry, refresh: onRefresh, loadMore, openStory },
  };
}
