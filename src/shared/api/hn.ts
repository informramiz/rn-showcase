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

const ITEM_TYPES: readonly string[] = ['story', 'comment', 'job', 'poll', 'pollopt'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isNumberArray = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((n) => typeof n === 'number');

/** Read an optional field, throwing a parse error when it is present with the wrong type. */
function field<T>(raw: Record<string, unknown>, key: string, guard: (v: unknown) => v is T): T | undefined {
  const value = raw[key];
  if (value === undefined || value === null) return undefined;
  if (!guard(value)) throw new ApiError('parse', `Unexpected type for item field "${key}"`);
  return value;
}
const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number => typeof v === 'number';
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isItemType = (v: unknown): v is NonNullable<HNItem['type']> =>
  typeof v === 'string' && ITEM_TYPES.includes(v);

/** Validate an untrusted API payload and build an HNItem from it. */
export function parseItem(raw: unknown): HNItem {
  if (!isRecord(raw) || typeof raw.id !== 'number') {
    throw new ApiError('parse', 'Unexpected item payload');
  }
  return {
    id: raw.id,
    type: field(raw, 'type', isItemType),
    by: field(raw, 'by', isString),
    time: field(raw, 'time', isNumber),
    title: field(raw, 'title', isString),
    url: field(raw, 'url', isString),
    text: field(raw, 'text', isString),
    score: field(raw, 'score', isNumber),
    descendants: field(raw, 'descendants', isNumber),
    kids: field(raw, 'kids', isNumberArray),
    parent: field(raw, 'parent', isNumber),
    deleted: field(raw, 'deleted', isBoolean),
    dead: field(raw, 'dead', isBoolean),
  };
}

export async function fetchStoryIds(feed: FeedKind, signal?: AbortSignal): Promise<number[]> {
  const ids = await getJson(FEED_PATH[feed], { signal });
  if (!isNumberArray(ids)) throw new ApiError('parse', `Unexpected ids payload for ${feed}`);
  return ids;
}

export async function fetchItem(id: number, signal?: AbortSignal): Promise<HNItem> {
  const raw = await getJson(`/item/${id}.json`, { signal });
  // The API answers 200 with `null` for unknown ids.
  if (raw === null) throw new ApiError('not_found', `Item ${id} not found`);
  return parseItem(raw);
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
