import { useMemo } from 'react';
import { useHistory } from './store';

/** Ids of every story the user has opened, for dimming read rows. */
export function useReadIds(): ReadonlySet<number> {
  const entries = useHistory((s) => s.entries);
  return useMemo(() => new Set(entries.map((e) => e.story.id)), [entries]);
}
