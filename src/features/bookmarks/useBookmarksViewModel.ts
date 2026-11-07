import { useOpenStory } from '@/features/history/useOpenStory';
import { useReadIds } from '@/features/history/useReadIds';
import { useBookmarks } from './store';

export function useBookmarksViewModel() {
  const stories = useBookmarks((s) => s.items);
  const readIds = useReadIds();
  const openStory = useOpenStory();
  return { state: { stories, readIds }, actions: { openStory } };
}
