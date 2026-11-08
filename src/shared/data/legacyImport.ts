import type { StorySummary } from '@/shared/api';
import type { Repositories } from './ports';

/** AsyncStorage keys written by the Zustand `persist` stores before the local DB existed. */
export const LEGACY_BOOKMARKS_KEY = 'bookmarks';
export const LEGACY_HISTORY_KEY = 'history';
/** The old TanStack Query persister blob; now replaced by the item cache, so it is just deleted. */
export const LEGACY_QUERY_CACHE_KEY = 'hn-query-cache';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
}

function isStory(value: unknown): value is StorySummary {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as StorySummary).id === 'number' &&
    typeof (value as StorySummary).title === 'string'
  );
}

/** Zustand persist writes `{ state: {...}, version }`; anything else is treated as empty. */
function parseState(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { state?: unknown };
    return typeof parsed.state === 'object' && parsed.state !== null
      ? (parsed.state as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * One-time move of bookmarks and history from the old AsyncStorage stores into
 * the repositories. Idempotent: keys are removed only after a successful import.
 * Returns how many rows were imported.
 */
export async function importLegacyStores(
  storage: KeyValueStorage,
  repos: Pick<Repositories, 'bookmarks' | 'history'>,
  now: number,
): Promise<{ bookmarks: number; history: number }> {
  const items = parseState(await storage.getItem(LEGACY_BOOKMARKS_KEY)).items;
  const stories = Array.isArray(items) ? items.filter(isStory) : [];
  const saved = new Set((await repos.bookmarks.list()).map((b) => b.story.id));
  // The old list is newest first; give each an older timestamp so the order survives.
  for (const [index, story] of stories.entries()) {
    if (!saved.has(story.id)) await repos.bookmarks.toggle(story, now - index);
  }

  const entries = parseState(await storage.getItem(LEGACY_HISTORY_KEY)).entries;
  const reads = Array.isArray(entries)
    ? entries.filter(
        (e): e is { story: StorySummary; readAt: number } =>
          isStory((e as { story?: unknown }).story) && typeof (e as { readAt?: unknown }).readAt === 'number',
      )
    : [];
  for (const entry of [...reads].reverse()) await repos.history.markRead(entry.story, entry.readAt);

  await storage.removeItem(LEGACY_BOOKMARKS_KEY);
  await storage.removeItem(LEGACY_HISTORY_KEY);
  await storage.removeItem(LEGACY_QUERY_CACHE_KEY);
  return { bookmarks: stories.length, history: reads.length };
}
