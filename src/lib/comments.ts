import type { HNItem } from '../api';

export type NodeStatus = 'loading' | 'error' | 'loaded';

export type ItemState = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; item: HNItem };

export interface ThreadRow {
  id: number;
  depth: number;
  state: ItemState;
  replyCount: number;
  expanded: boolean;
}

/**
 * Flatten a lazily loaded comment tree into the rows that are currently
 * visible. Children are only emitted for expanded nodes, so collapsing a node
 * hides its whole subtree without touching the loaded data.
 */
export function flattenThread(
  rootIds: readonly number[],
  items: Readonly<Record<number, ItemState>>,
  expanded: ReadonlySet<number>,
): ThreadRow[] {
  const rows: ThreadRow[] = [];
  const walk = (ids: readonly number[], depth: number) => {
    for (const id of ids) {
      const state = items[id] ?? { status: 'loading' as const };
      if (state.status === 'loaded' && (state.item.deleted || state.item.dead)) continue;
      const kids = state.status === 'loaded' ? (state.item.kids ?? []) : [];
      const isExpanded = expanded.has(id);
      rows.push({ id, depth, state, replyCount: kids.length, expanded: isExpanded });
      if (isExpanded && kids.length > 0) walk(kids, depth + 1);
    }
  };
  walk(rootIds, 0);
  return rows;
}

export function toggleSet<T>(set: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
  '&#x2F;': '/',
  '&#39;': "'",
};

/** Convert the HTML subset used by HN comment text to plain text. */
export function htmlToText(html: string | undefined): string {
  if (!html) return '';
  return html
    .replace(/<p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a [^>]*href="([^"]*)"[^>]*>.*?<\/a>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&(?:amp|lt|gt|quot|#x27|#x2F|#39);/g, (m) => ENTITIES[m] ?? m)
    .trim();
}
