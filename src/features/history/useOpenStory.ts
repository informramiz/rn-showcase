import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import type { StorySummary } from '@/shared/api';
import { useHistory } from './store';

/** Navigate to a story and record it in the reading history. */
export function useOpenStory(): (story: StorySummary) => void {
  const router = useRouter();
  const markRead = useHistory((s) => s.markRead);
  return useCallback(
    (story) => {
      router.push({ pathname: '/story/[id]', params: { id: String(story.id) } });
      markRead(story);
    },
    [router, markRead],
  );
}
