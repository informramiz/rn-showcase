import { useMemo } from 'react';
import { useHistory } from './store';
import { useOpenStory } from './useOpenStory';
import { useReadIds } from './useReadIds';

export function useHistoryViewModel() {
  const entries = useHistory((s) => s.entries);
  const stories = useMemo(() => entries.map((e) => e.story), [entries]);
  const readIds = useReadIds();
  const openStory = useOpenStory();
  return { state: { stories, readIds }, actions: { openStory } };
}
