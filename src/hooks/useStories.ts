import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { fetchStoryIds, fetchStoryPage, PAGE_SIZE, type FeedKind, type HNItem } from '../api';

export interface StoryPage {
  items: HNItem[];
  nextOffset: number | null;
}

export const storiesKey = (feed: FeedKind) => ['stories', feed] as const;
export const idsKey = (feed: FeedKind) => ['ids', feed] as const;

export function useStories(feed: FeedKind) {
  const client = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const query = useInfiniteQuery({
    queryKey: storiesKey(feed),
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }): Promise<StoryPage> => {
      const ids = await client.query({
        queryKey: idsKey(feed),
        queryFn: ({ signal: s }) => fetchStoryIds(feed, s),
        staleTime: 60_000,
      });
      const items = await fetchStoryPage(ids, pageParam, signal);
      const next = pageParam + PAGE_SIZE;
      return { items, nextOffset: next < ids.length ? next : null };
    },
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });

  const { refetch } = query;
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Drop the cached id list and keep only page one so a refresh does not
      // re-download every page the user scrolled through.
      client.removeQueries({ queryKey: idsKey(feed) });
      client.setQueryData<InfiniteData<StoryPage, number>>(storiesKey(feed), (d) =>
        d ? { pages: d.pages.slice(0, 1), pageParams: d.pageParams.slice(0, 1) } : d,
      );
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [client, feed, refetch]);

  const pages = query.data?.pages;
  const stories = useMemo(() => pages?.flatMap((p) => p.items) ?? [], [pages]);
  return { ...query, stories, refreshing, refresh };
}
