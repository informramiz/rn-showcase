import { useMemo } from 'react';
import { useHistoryList } from './useHistory';

/** Ids of every story the user has opened, for dimming read rows. */
export function useReadIds(): ReadonlySet<number> {
  const { data } = useHistoryList();
  return useMemo(() => new Set(data?.map((e) => e.story.id)), [data]);
}
