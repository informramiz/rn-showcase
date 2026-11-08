import type { SearchScope } from './ports';

/** Query keys for data read from the local store. Everything under ['db'] is local. */
export const dbKeys = {
  all: ['db'] as const,
  bookmarks: ['db', 'bookmarks'] as const,
  history: ['db', 'history'] as const,
  dismissed: ['db', 'dismissed'] as const,
  notes: (storyId: number) => ['db', 'notes', storyId] as const,
  allNotes: ['db', 'notes'] as const,
  search: ['db', 'search'] as const,
  searchFor: (query: string, scope: SearchScope) => ['db', 'search', scope, query] as const,
  outbox: ['db', 'outbox'] as const,
};

/**
 * Local reads never need the network and only change through our own
 * mutations, which invalidate them, so they never go stale on their own.
 */
export const localQueryOptions = { networkMode: 'always', staleTime: Infinity } as const;
