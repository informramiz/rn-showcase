import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flattenThread, toggleSet, type ItemState } from '../lib/comments';
import { useItemLoader } from './useItem';

/**
 * Lazy comment tree. Top-level comments load on mount; replies load the first
 * time a comment is expanded.
 */
export function useCommentThread(rootIds: readonly number[]) {
  const load = useItemLoader();
  const [items, setItems] = useState<Record<number, ItemState>>({});
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  const requested = useRef(new Set<number>());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadIds = useCallback(
    (ids: readonly number[], force = false) => {
      const todo = ids.filter((id) => force || !requested.current.has(id));
      if (todo.length === 0) return;
      todo.forEach((id) => requested.current.add(id));
      setItems((prev) => {
        const next = { ...prev };
        todo.forEach((id) => (next[id] = { status: 'loading' }));
        return next;
      });
      todo.forEach((id) => {
        load(id)
          .then((item) => {
            if (mounted.current) setItems((p) => ({ ...p, [id]: { status: 'loaded', item } }));
          })
          .catch(() => {
            requested.current.delete(id);
            if (mounted.current) setItems((p) => ({ ...p, [id]: { status: 'error' } }));
          });
      });
    },
    [load],
  );

  const rootKey = rootIds.join(',');
  useEffect(() => {
    loadIds(rootIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootKey, loadIds]);

  const toggle = useCallback(
    (id: number) => {
      const state = items[id];
      const kids = state?.status === 'loaded' ? (state.item.kids ?? []) : [];
      if (!expanded.has(id)) loadIds(kids);
      setExpanded((e) => toggleSet(e, id));
    },
    [items, expanded, loadIds],
  );

  const retry = useCallback((id: number) => loadIds([id], true), [loadIds]);

  const rows = useMemo(() => flattenThread(rootIds, items, expanded), [rootIds, items, expanded]);
  return { rows, toggle, retry };
}
