import {
  fetchItem,
  fetchItems,
  fetchStoryIds,
  isApiError,
  PAGE_SIZE,
  type ApiErrorKind,
  type FeedKind,
  type HNItem,
} from '@/shared/api';
import type { ItemCache } from './ports';

/** The network calls the source needs; injectable for tests. */
export interface HnApi {
  fetchStoryIds(feed: FeedKind, signal?: AbortSignal): Promise<number[]>;
  fetchItem(id: number, signal?: AbortSignal): Promise<HNItem>;
  fetchItems(ids: number[], signal?: AbortSignal): Promise<HNItem[]>;
}

export const networkHnApi: HnApi = { fetchStoryIds, fetchItem, fetchItems };

/** Offline-first access to HN: the network when it answers, the local cache when it does not. */
export interface HnSource {
  storyIds(feed: FeedKind, signal?: AbortSignal): Promise<number[]>;
  /** One page of listable stories (not deleted, dead or untitled) starting at `offset`. */
  storyPage(ids: readonly number[], offset: number, signal?: AbortSignal): Promise<HNItem[]>;
  item(id: number, signal?: AbortSignal): Promise<HNItem>;
}

/** Failures where a cached copy is a better answer than an error. Parse and not-found errors are real answers. */
const CACHE_FALLBACK: readonly ApiErrorKind[] = ['network', 'timeout', 'http'];

export function canServeFromCache(error: unknown): boolean {
  return isApiError(error) && CACHE_FALLBACK.includes(error.kind);
}

const isListable = (i: HNItem) => !i.deleted && !i.dead && Boolean(i.title);

export function createHnSource(
  cache: ItemCache,
  api: HnApi = networkHnApi,
  now: () => number = Date.now,
): HnSource {
  /**
   * Network first, write-through to the cache, cache on failure. A failed cache
   * write is logged but never hides fresh data from the user.
   */
  async function networkFirst<T>(
    fetch: () => Promise<T>,
    store: (value: T) => Promise<void>,
    fallback: () => Promise<T | undefined>,
  ): Promise<T> {
    let value: T;
    try {
      value = await fetch();
    } catch (error) {
      if (!canServeFromCache(error)) throw error;
      const cached = await fallback();
      if (cached === undefined) throw error;
      return cached;
    }
    await store(value).catch((e: unknown) => {
      console.warn('Item cache write failed', e);
    });
    return value;
  }

  return {
    storyIds: (feed, signal) =>
      networkFirst(
        () => api.fetchStoryIds(feed, signal),
        (ids) => cache.putFeed(feed, ids, now()),
        () => cache.getFeed(feed),
      ),
    storyPage: async (ids, offset, signal) => {
      const page = ids.slice(offset, offset + PAGE_SIZE);
      const items = await networkFirst(
        () => api.fetchItems(page, signal),
        (list) => cache.putItems(list, now()),
        async () => {
          const cached = await cache.getItems(page);
          return cached.length > 0 ? cached : undefined;
        },
      );
      return items.filter(isListable);
    },
    item: (id, signal) =>
      networkFirst(
        () => api.fetchItem(id, signal),
        (item) => cache.putItems([item], now()),
        () => cache.getItem(id),
      ),
  };
}
