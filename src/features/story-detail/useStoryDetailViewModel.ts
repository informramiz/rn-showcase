import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { useBookmarks } from '@/features/bookmarks/store';
import { useHistory } from '@/features/history/store';
import { toSummary } from '@/shared/api';
import { hostname } from '@/shared/lib/format';
import { htmlToText } from './comments';
import { useItem } from './useItem';

/** Story detail: the item query (server state) plus bookmark and history stores (client state). */
export function useStoryDetailViewModel() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const { data: story, isPending, error, refetch } = useItem(id);
  const bookmarked = useBookmarks((s) => s.items.some((i) => i.id === id));
  const toggleBookmark = useBookmarks((s) => s.toggle);
  const markRead = useHistory((s) => s.markRead);

  useEffect(() => {
    if (story) markRead(toSummary(story));
  }, [story, markRead]);

  return {
    state: {
      story,
      isPending,
      error,
      bookmarked,
      host: story ? hostname(story.url) : '',
      bodyText: story?.text ? htmlToText(story.text) : null,
    },
    actions: {
      retry: () => void refetch(),
      toggleBookmark: () => {
        if (story) toggleBookmark(toSummary(story));
      },
      openLink: () => {
        if (story?.url) void WebBrowser.openBrowserAsync(story.url);
      },
    },
  };
}
