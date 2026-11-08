/**
 * Repository ports: what the app needs from local storage. Native builds use
 * SQLite through Drizzle (./sqlite), the web build an in-memory store
 * persisted to AsyncStorage (./memory). Both pass the same contract tests.
 */
import type { FeedKind, HNItem, StorySummary } from '@/shared/api';
import type { Note, NoteWithSync, OutboxEntry } from '@/shared/sync/types';

export const HISTORY_LIMIT = 200;
export const SEARCH_LIMIT = 50;

export interface Bookmark {
  story: StorySummary;
  savedAt: number;
  knownDescendants: number;
}

export interface HistoryEntry {
  story: StorySummary;
  readAt: number;
}

export type SearchScope = 'all' | 'saved';

export interface ItemCache {
  putItems(items: readonly HNItem[], now: number): Promise<void>;
  getItem(id: number): Promise<HNItem | undefined>;
  /** Cached items in the order of `ids`; missing ids are skipped. */
  getItems(ids: readonly number[]): Promise<HNItem[]>;
  putFeed(feed: FeedKind, ids: readonly number[], now: number): Promise<void>;
  getFeed(feed: FeedKind): Promise<number[] | undefined>;
  /** Full-text search over cached stories, best match first. */
  search(query: string, scope: SearchScope, limit?: number): Promise<StorySummary[]>;
  /** Drop items and feeds fetched before `before`, keeping stories that are saved, read or annotated. */
  prune(before: number): Promise<void>;
}

export interface BookmarkRepository {
  /** Most recently saved first. */
  list(): Promise<Bookmark[]>;
  /** Returns whether the story is saved after the call. */
  toggle(story: StorySummary, now: number): Promise<boolean>;
  remove(storyId: number): Promise<void>;
  clear(): Promise<void>;
  setKnownDescendants(storyId: number, count: number): Promise<void>;
}

export interface HistoryRepository {
  /** Most recently read first, at most HISTORY_LIMIT entries. */
  list(): Promise<HistoryEntry[]>;
  markRead(story: StorySummary, now: number): Promise<void>;
  clear(): Promise<void>;
}

export interface DismissedRepository {
  list(): Promise<number[]>;
  dismiss(storyId: number, now: number): Promise<void>;
  clear(): Promise<void>;
}

export interface NoteDraft {
  /** Omit to create a new note. */
  id?: string;
  storyId: number;
  body: string;
  highlight?: string;
  tags: readonly string[];
}

export interface NotesRepository {
  /** Newest first, each with its sync state derived from the outbox. */
  listForStory(storyId: number): Promise<NoteWithSync[]>;
  get(id: string): Promise<Note | undefined>;
  /** Save locally and queue the change in the outbox, atomically. */
  save(draft: NoteDraft, now: number): Promise<Note>;
  /** Delete locally and queue the delete in the outbox, atomically. */
  remove(id: string, now: number): Promise<void>;
  /** Store a server-confirmed copy without queueing a change. */
  applyRemote(note: Note): Promise<void>;
  setVersion(id: string, version: number): Promise<void>;
}

export interface OutboxRepository {
  list(): Promise<OutboxEntry[]>;
  get(entityId: string): Promise<OutboxEntry | undefined>;
  put(entry: OutboxEntry): Promise<void>;
  remove(entityId: string): Promise<void>;
}

export interface Repositories {
  cache: ItemCache;
  bookmarks: BookmarkRepository;
  history: HistoryRepository;
  dismissed: DismissedRepository;
  notes: NotesRepository;
  outbox: OutboxRepository;
}
