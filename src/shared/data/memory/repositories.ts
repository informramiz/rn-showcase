import { toSummary, type FeedKind, type HNItem, type StorySummary } from '@/shared/api';
import { optionalText, summaryToItem } from '@/shared/data/mappers';
import {
  HISTORY_LIMIT,
  SEARCH_LIMIT,
  type BookmarkRepository,
  type DismissedRepository,
  type HistoryRepository,
  type ItemCache,
  type NotesRepository,
  type OutboxRepository,
  type Repositories,
} from '@/shared/data/ports';
import { matchesAllTokens, tokenize } from '@/shared/data/search';
import { normalizeTags, queueChange } from '@/shared/sync/outbox';
import type { Note, NoteSyncState, OutboxEntry } from '@/shared/sync/types';

/** The whole store: one map per table. */
export interface MemoryState {
  items: Map<number, { item: HNItem; fetchedAt: number }>;
  feeds: Map<FeedKind, { ids: number[]; fetchedAt: number }>;
  bookmarks: Map<number, { savedAt: number; knownDescendants: number }>;
  history: Map<number, number>;
  dismissed: Map<number, number>;
  notes: Map<string, Note>;
  outbox: Map<string, OutboxEntry>;
}

/** JSON form of MemoryState: each map as an array of entries. */
export type SerializedMemoryState = {
  [K in keyof MemoryState]?: MemoryState[K] extends Map<infer A, infer B> ? [A, B][] : never;
};

export function emptyMemoryState(): MemoryState {
  return {
    items: new Map(),
    feeds: new Map(),
    bookmarks: new Map(),
    history: new Map(),
    dismissed: new Map(),
    notes: new Map(),
    outbox: new Map(),
  };
}

export function serializeMemoryState(s: MemoryState): SerializedMemoryState {
  return {
    items: [...s.items],
    feeds: [...s.feeds],
    bookmarks: [...s.bookmarks],
    history: [...s.history],
    dismissed: [...s.dismissed],
    notes: [...s.notes],
    outbox: [...s.outbox],
  };
}

export function deserializeMemoryState(s: SerializedMemoryState): MemoryState {
  return {
    items: new Map(s.items),
    feeds: new Map(s.feeds),
    bookmarks: new Map(s.bookmarks),
    history: new Map(s.history),
    dismissed: new Map(s.dismissed),
    notes: new Map(s.notes),
    outbox: new Map(s.outbox),
  };
}

function syncState(entry: OutboxEntry | undefined): NoteSyncState {
  if (!entry) return 'synced';
  return entry.status === 'failed' ? 'failed' : 'pending';
}

/**
 * In-memory implementation of the repository ports, used by the web build
 * (the default wa-sqlite build has no FTS5 and GitHub Pages cannot send the
 * COOP/COEP headers OPFS needs) and by fast UI tests. `onChange` is called
 * with the state after every write so the caller can persist it.
 */
export function createMemoryRepositories(
  state: MemoryState = emptyMemoryState(),
  newId: () => string = () => Math.random().toString(36).slice(2),
  onChange: (state: MemoryState) => void = () => undefined,
): Repositories {
  const write = <T>(fn: () => T): Promise<T> => {
    const result = fn();
    onChange(state);
    return Promise.resolve(result);
  };
  const read = <T>(fn: () => T): Promise<T> => Promise.resolve(fn());
  const storyOf = (id: number) => {
    const cached = state.items.get(id);
    return cached && toSummary(cached.item);
  };
  const ensureStory = (story: StorySummary, now: number) => {
    if (!state.items.has(story.id)) state.items.set(story.id, { item: summaryToItem(story), fetchedAt: now });
  };

  const cache: ItemCache = {
    putItems: (list, now) =>
      write(() => {
        for (const item of list) state.items.set(item.id, { item, fetchedAt: now });
      }),
    getItem: (id) => read(() => state.items.get(id)?.item),
    getItems: (ids) => read(() => ids.flatMap((id) => state.items.get(id)?.item ?? [])),
    putFeed: (feed, ids, now) =>
      write(() => {
        state.feeds.set(feed, { ids: [...ids], fetchedAt: now });
      }),
    getFeed: (feed) => read(() => state.feeds.get(feed)?.ids),
    search: (query, scope, limit = SEARCH_LIMIT) =>
      read(() => {
        const tokens = tokenize(query);
        if (tokens.length === 0) return [];
        const scored: { item: HNItem; score: number }[] = [];
        for (const { item } of state.items.values()) {
          if (!item.title) continue;
          if (scope === 'saved' && !state.bookmarks.has(item.id)) continue;
          if (!matchesAllTokens(`${item.title} ${item.text ?? ''}`, tokens)) continue;
          // Rank title hits above body-only hits, roughly what bm25 does for short titles.
          scored.push({ item, score: matchesAllTokens(item.title, tokens) ? 0 : 1 });
        }
        scored.sort((a, b) => a.score - b.score || b.item.id - a.item.id);
        return scored.slice(0, limit).map((s) => toSummary(s.item));
      }),
    prune: (before) =>
      write(() => {
        for (const [feed, value] of state.feeds) if (value.fetchedAt < before) state.feeds.delete(feed);
        const keep = new Set<number>([
          ...state.bookmarks.keys(),
          ...state.history.keys(),
          ...[...state.notes.values()].map((n) => n.storyId),
        ]);
        for (const [id, value] of state.items) {
          if (value.fetchedAt < before && !keep.has(id)) state.items.delete(id);
        }
      }),
  };

  const bookmarks: BookmarkRepository = {
    list: () =>
      read(() =>
        [...state.bookmarks]
          .flatMap(([id, b]) => {
            const story = storyOf(id);
            return story ? [{ story, ...b }] : [];
          })
          .sort((a, b) => b.savedAt - a.savedAt),
      ),
    toggle: (story, now) =>
      write(() => {
        if (state.bookmarks.delete(story.id)) return false;
        ensureStory(story, now);
        state.bookmarks.set(story.id, { savedAt: now, knownDescendants: story.descendants ?? 0 });
        return true;
      }),
    remove: (storyId) =>
      write(() => {
        state.bookmarks.delete(storyId);
      }),
    clear: () =>
      write(() => {
        state.bookmarks.clear();
      }),
    setKnownDescendants: (storyId, count) =>
      write(() => {
        const b = state.bookmarks.get(storyId);
        if (b) state.bookmarks.set(storyId, { ...b, knownDescendants: count });
      }),
  };

  const history: HistoryRepository = {
    list: () =>
      read(() =>
        [...state.history]
          .flatMap(([id, readAt]) => {
            const story = storyOf(id);
            return story ? [{ story, readAt }] : [];
          })
          .sort((a, b) => b.readAt - a.readAt)
          .slice(0, HISTORY_LIMIT),
      ),
    markRead: (story, now) =>
      write(() => {
        ensureStory(story, now);
        state.history.set(story.id, now);
        const newestFirst = [...state.history].sort((a, b) => b[1] - a[1]);
        for (const [id] of newestFirst.slice(HISTORY_LIMIT)) state.history.delete(id);
      }),
    clear: () =>
      write(() => {
        state.history.clear();
      }),
  };

  const dismissed: DismissedRepository = {
    list: () => read(() => [...state.dismissed.keys()]),
    dismiss: (storyId, now) =>
      write(() => {
        if (!state.dismissed.has(storyId)) state.dismissed.set(storyId, now);
      }),
    clear: () =>
      write(() => {
        state.dismissed.clear();
      }),
  };

  const enqueue = (entityId: string, op: OutboxEntry['op'], baseVersion: number, now: number) => {
    const next = queueChange(state.outbox.get(entityId), { entityId, op, baseVersion }, now);
    if (next) state.outbox.set(entityId, next);
    else state.outbox.delete(entityId);
  };

  const notes: NotesRepository = {
    listForStory: (storyId) =>
      read(() =>
        [...state.notes.values()]
          .filter((n) => n.storyId === storyId)
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((n) => ({ ...n, sync: syncState(state.outbox.get(n.id)) })),
      ),
    get: (id) => read(() => state.notes.get(id)),
    save: (draft, now) =>
      write(() => {
        const existing = draft.id === undefined ? undefined : state.notes.get(draft.id);
        const note: Note = {
          id: existing?.id ?? draft.id ?? newId(),
          storyId: draft.storyId,
          body: draft.body.trim(),
          highlight: optionalText(draft.highlight),
          tags: normalizeTags(draft.tags),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          version: existing?.version ?? 0,
        };
        state.notes.set(note.id, note);
        enqueue(note.id, 'upsert', note.version, now);
        return note;
      }),
    remove: (id, now) =>
      write(() => {
        const existing = state.notes.get(id);
        if (!existing) return;
        state.notes.delete(id);
        enqueue(id, 'delete', existing.version, now);
      }),
    applyRemote: (note) =>
      write(() => {
        state.notes.set(note.id, note);
      }),
    setVersion: (id, version) =>
      write(() => {
        const n = state.notes.get(id);
        if (n) state.notes.set(id, { ...n, version });
      }),
  };

  const outbox: OutboxRepository = {
    list: () => read(() => [...state.outbox.values()].sort((a, b) => a.createdAt - b.createdAt)),
    get: (entityId) => read(() => state.outbox.get(entityId)),
    put: (entry) =>
      write(() => {
        state.outbox.set(entry.entityId, entry);
      }),
    remove: (entityId) =>
      write(() => {
        state.outbox.delete(entityId);
      }),
  };

  return { cache, bookmarks, history, dismissed, notes, outbox };
}
