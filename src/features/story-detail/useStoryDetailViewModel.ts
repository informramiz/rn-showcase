import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { useIsBookmarked, useToggleBookmark } from '@/features/bookmarks/useBookmarks';
import { useMarkRead } from '@/features/history/useHistory';
import { toSummary } from '@/shared/api';
import { hostname } from '@/shared/lib/format';
import { useServices } from '@/shared/services/AppServices';
import { htmlToText } from './comments';
import { useItem } from './useItem';

/** Only http(s) links may be opened; anything else (javascript:, file:, ...) is rejected. */
export function isWebUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Story detail: the item query (server state) plus bookmark and history in the local store. */
export function useStoryDetailViewModel() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const { data: story, isPending, error, refetch } = useItem(id);
  const bookmarked = useIsBookmarked(id);
  const toggleBookmark = useToggleBookmark();
  const markRead = useMarkRead();
  const { repos } = useServices();

  useEffect(() => {
    if (story) markRead(toSummary(story));
  }, [story, markRead]);

  // The user has now seen these comments: only newer ones should trigger an alert.
  useEffect(() => {
    if (story && bookmarked) void repos.bookmarks.setKnownDescendants(story.id, story.descendants ?? 0);
  }, [story, bookmarked, repos]);

  return {
    state: {
      story,
      isPending,
      error,
      bookmarked,
      canOpenLink: isWebUrl(story?.url),
      host: story ? hostname(story.url) : '',
      bodyText: story?.text ? htmlToText(story.text) : null,
    },
    actions: {
      retry: () => void refetch(),
      toggleBookmark: () => {
        if (story) toggleBookmark(toSummary(story));
      },
      openLink: () => {
        if (isWebUrl(story?.url)) void WebBrowser.openBrowserAsync(story.url);
      },
    },
  };
}
