import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { PAGE_SIZE, type FeedKind, type HNItem } from '@/shared/api';
import { useServices } from '@/shared/services/AppServices';

export interface StoryPage {
  items: HNItem[];
  nextOffset: number | null;
  /** The id list this feed run paginates over, so later pages never see a reshuffled list. */
  ids: number[];
}

interface PageParam {
  offset: number;
  ids?: number[];
}

const FIRST_PAGE: PageParam = { offset: 0 };

export const storiesKey = (feed: FeedKind) => ['stories', feed] as const;
export const idsKey = (feed: FeedKind) => ['ids', feed] as const;

export function useStories(feed: FeedKind) {
  const client = useQueryClient();
  const { hn } = useServices();
  const [refreshing, setRefreshing] = useState(false);

  const query = useInfiniteQuery({
    queryKey: storiesKey(feed),
    initialPageParam: FIRST_PAGE,
    queryFn: async ({ pageParam, signal }): Promise<StoryPage> => {
      // Later pages reuse the snapshot taken for page one; only page one reads the shared id cache.
      const ids: number[] =
        pageParam.ids ??
        (await client.query({
          queryKey: idsKey(feed),
          queryFn: ({ signal: s }) => hn.storyIds(feed, s),
          staleTime: 60_000,
        }));
      const items = await hn.storyPage(ids, pageParam.offset, signal);
      const next = pageParam.offset + PAGE_SIZE;
      return { items, ids, nextOffset: next < ids.length ? next : null };
    },
    getNextPageParam: (last): PageParam | undefined =>
      last.nextOffset === null ? undefined : { offset: last.nextOffset, ids: last.ids },
  });

  const { refetch } = query;
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Drop the cached id list and keep only page one so a refresh does not
      // re-download every page the user scrolled through.
      client.removeQueries({ queryKey: idsKey(feed) });
      client.setQueryData<InfiniteData<StoryPage, PageParam>>(storiesKey(feed), (d) =>
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
