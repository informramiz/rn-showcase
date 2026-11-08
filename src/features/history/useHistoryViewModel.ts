import { useMemo } from 'react';
import { useHistoryList } from './useHistory';
import { useOpenStory } from './useOpenStory';
import { useReadIds } from './useReadIds';

export function useHistoryViewModel() {
  const { data } = useHistoryList();
  const stories = useMemo(() => data?.map((e) => e.story) ?? [], [data]);
  const readIds = useReadIds();
  const openStory = useOpenStory();
  return { state: { stories, readIds }, actions: { openStory } };
}
