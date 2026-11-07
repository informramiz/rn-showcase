import { useCallback, useState } from 'react';
import { toggleSet } from './comments';

/**
 * Expanded/collapsed state of the comment tree. Item data lives in the
 * TanStack Query cache: each mounted comment calls `useItem`, so replies are
 * fetched the first time their parent is expanded (the children only mount
 * then) and a failed comment can be retried with the query's own `refetch`.
 */
export function useCommentThread() {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const toggle = useCallback((id: number) => {
    setExpanded((e) => toggleSet(e, id));
  }, []);
  return { expanded, toggle };
}
