import { ApiError } from './errors';
import { getJson } from './http';
import type { FeedKind, HNItem } from './types';

const FEED_PATH: Record<FeedKind, string> = {
  top: '/topstories.json',
  new: '/newstories.json',
  best: '/beststories.json',
  ask: '/askstories.json',
  show: '/showstories.json',
};

export const PAGE_SIZE = 20;
const BATCH_SIZE = 10;

export async function fetchStoryIds(feed: FeedKind, signal?: AbortSignal): Promise<number[]> {
  const ids = await getJson<number[] | null>(FEED_PATH[feed], { signal });
  if (!Array.isArray(ids)) throw new ApiError('parse', `Unexpected ids payload for ${feed}`);
  return ids;
}

export async function fetchItem(id: number, signal?: AbortSignal): Promise<HNItem> {
  const item = await getJson<HNItem | null>(`/item/${id}.json`, { signal });
  // The API answers 200 with `null` for unknown ids.
  if (item === null || typeof item !== 'object') {
    throw new ApiError('not_found', `Item ${id} not found`);
  }
  return item;
}

/**
 * Fetch items in batches of BATCH_SIZE so a page of 20 does not open 20
 * sockets at once. Items that fail individually are dropped; if every item
 * fails the first error is thrown so the UI can show an error state.
 */
export async function fetchItems(ids: number[], signal?: AbortSignal): Promise<HNItem[]> {
  const out: HNItem[] = [];
  let firstError: unknown;
  let failures = 0;
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((id) => fetchItem(id, signal)));
    for (const r of results) {
      if (r.status === 'fulfilled') out.push(r.value);
      else {
        failures += 1;
        firstError ??= r.reason;
      }
    }
  }
  if (ids.length > 0 && failures === ids.length) throw firstError;
  return out;
}

export async function fetchStoryPage(ids: number[], offset: number, signal?: AbortSignal): Promise<HNItem[]> {
  const items = await fetchItems(ids.slice(offset, offset + PAGE_SIZE), signal);
  return items.filter((i) => !i.deleted && !i.dead && i.title);
}
