import { and, desc, eq, inArray, lt, notInArray, sql } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
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
  type SearchScope,
} from '@/shared/data/ports';
import { toFtsQuery } from '@/shared/data/search';
import { normalizeTags, queueChange } from '@/shared/sync/outbox';
import type { Note, NoteSyncState, OutboxEntry } from '@/shared/sync/types';
import * as schema from './schema';

const { bookmarks, dismissed, feeds, history, items, notes, outbox } = schema;

/**
 * Any synchronous Drizzle SQLite database with this schema: expo-sqlite in the
 * app, better-sqlite3 in the repository tests.
 */
export type AppDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

type ItemRow = typeof items.$inferSelect;
type NoteRow = typeof notes.$inferSelect;
type OutboxRow = typeof outbox.$inferSelect;

const orUndefined = <T>(v: T | null): T | undefined => v ?? undefined;

function rowToItem(r: ItemRow): HNItem {
  return {
    id: r.id,
    type: orUndefined(r.type) as HNItem['type'],
    by: orUndefined(r.by),
    time: orUndefined(r.time),
    title: orUndefined(r.title),
    url: orUndefined(r.url),
    text: orUndefined(r.text),
    score: orUndefined(r.score),
    descendants: orUndefined(r.descendants),
    kids: orUndefined(r.kids),
    parent: orUndefined(r.parent),
    deleted: orUndefined(r.deleted),
    dead: orUndefined(r.dead),
  };
}

function itemToRow(i: HNItem, now: number): ItemRow {
  return {
    id: i.id,
    type: i.type ?? null,
    by: i.by ?? null,
    time: i.time ?? null,
    title: i.title ?? null,
    url: i.url ?? null,
    text: i.text ?? null,
    score: i.score ?? null,
    descendants: i.descendants ?? null,
    kids: i.kids ?? null,
    parent: i.parent ?? null,
    deleted: i.deleted ?? null,
    dead: i.dead ?? null,
    fetchedAt: now,
  };
}

function rowToNote(r: NoteRow): Note {
  return { ...r, highlight: orUndefined(r.highlight) };
}

function rowToEntry(r: OutboxRow): OutboxEntry {
  return { ...r, lastError: orUndefined(r.lastError) };
}

function entryToRow(e: OutboxEntry): OutboxRow {
  return { ...e, lastError: e.lastError ?? null };
}

function syncState(entry: OutboxRow | undefined): NoteSyncState {
  if (!entry) return 'synced';
  return entry.status === 'failed' ? 'failed' : 'pending';
}

/** Insert summary fields for a story that is not cached yet; never overwrites a full item. */
function ensureStory(db: AppDatabase, story: StorySummary, now: number): void {
  db.insert(items)
    .values(itemToRow(summaryToItem(story), now))
    .onConflictDoNothing()
    .run();
}

function storyRow(db: AppDatabase, id: number): StorySummary | undefined {
  const row = db.select().from(items).where(eq(items.id, id)).get();
  return row ? toSummary(rowToItem(row)) : undefined;
}

/** Run a synchronous query as a promise so a thrown SQLite error becomes a rejection. */
function run<T>(fn: () => T): Promise<T> {
  try {
    return Promise.resolve(fn());
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
}

export function createSqliteRepositories(db: AppDatabase, newId: () => string): Repositories {
  const cache: ItemCache = {
    putItems: (list, now) =>
      run(() => {
        if (list.length === 0) return;
        db.transaction((tx) => {
          for (const item of list) {
            const row = itemToRow(item, now);
            tx.insert(items).values(row).onConflictDoUpdate({ target: items.id, set: row }).run();
          }
        });
      }),
    getItem: (id) =>
      run(() => {
        const row = db.select().from(items).where(eq(items.id, id)).get();
        return row ? rowToItem(row) : undefined;
      }),
    getItems: (ids) =>
      run(() => {
        if (ids.length === 0) return [];
        const rows = db
          .select()
          .from(items)
          .where(inArray(items.id, [...ids]))
          .all();
        const byId = new Map(rows.map((r) => [r.id, rowToItem(r)]));
        return ids.flatMap((id) => byId.get(id) ?? []);
      }),
    putFeed: (feed, ids, now) =>
      run(() => {
        const row = { feed, ids: [...ids], fetchedAt: now };
        db.insert(feeds).values(row).onConflictDoUpdate({ target: feeds.feed, set: row }).run();
      }),
    getFeed: (feed: FeedKind) =>
      run(() => {
        const row = db.select().from(feeds).where(eq(feeds.feed, feed)).get();
        return row?.ids;
      }),
    search: (query: string, scope: SearchScope, limit = SEARCH_LIMIT) =>
      run(() => {
        const match = toFtsQuery(query);
        if (!match) return [];
        const savedOnly = scope === 'saved' ? sql`AND i.id IN (SELECT story_id FROM bookmarks)` : sql``;
        const rows = db.all<{ id: number }>(sql`
        SELECT i.id AS id FROM stories_fts f
        JOIN items i ON i.id = f.rowid
        WHERE stories_fts MATCH ${match} ${savedOnly}
        ORDER BY bm25(stories_fts) LIMIT ${limit}`);
        return rows.flatMap((r) => storyRow(db, r.id) ?? []);
      }),
    prune: (before) =>
      run(() => {
        db.transaction((tx) => {
          tx.delete(feeds).where(lt(feeds.fetchedAt, before)).run();
          tx.delete(items)
            .where(
              and(
                lt(items.fetchedAt, before),
                notInArray(items.id, tx.select({ id: bookmarks.storyId }).from(bookmarks)),
                notInArray(items.id, tx.select({ id: history.storyId }).from(history)),
                notInArray(items.id, tx.select({ id: notes.storyId }).from(notes)),
              ),
            )
            .run();
        });
      }),
  };

  const bookmarkRepo: BookmarkRepository = {
    list: () =>
      run(() => {
        const rows = db
          .select()
          .from(bookmarks)
          .innerJoin(items, eq(items.id, bookmarks.storyId))
          .orderBy(desc(bookmarks.savedAt))
          .all();
        return rows.map((r) => ({
          story: toSummary(rowToItem(r.items)),
          savedAt: r.bookmarks.savedAt,
          knownDescendants: r.bookmarks.knownDescendants,
        }));
      }),
    toggle: (story, now) =>
      run(() =>
        db.transaction((tx) => {
          const existing = tx.select().from(bookmarks).where(eq(bookmarks.storyId, story.id)).get();
          if (existing) {
            tx.delete(bookmarks).where(eq(bookmarks.storyId, story.id)).run();
            return false;
          }
          ensureStory(tx, story, now);
          tx.insert(bookmarks)
            .values({ storyId: story.id, savedAt: now, knownDescendants: story.descendants ?? 0 })
            .run();
          return true;
        }),
      ),
    remove: (storyId) =>
      run(() => {
        db.delete(bookmarks).where(eq(bookmarks.storyId, storyId)).run();
      }),
    clear: () =>
      run(() => {
        db.delete(bookmarks).run();
      }),
    setKnownDescendants: (storyId, count) =>
      run(() => {
        db.update(bookmarks).set({ knownDescendants: count }).where(eq(bookmarks.storyId, storyId)).run();
      }),
  };

  const historyRepo: HistoryRepository = {
    list: () =>
      run(() => {
        const rows = db
          .select()
          .from(history)
          .innerJoin(items, eq(items.id, history.storyId))
          .orderBy(desc(history.readAt))
          .limit(HISTORY_LIMIT)
          .all();
        return rows.map((r) => ({ story: toSummary(rowToItem(r.items)), readAt: r.history.readAt }));
      }),
    markRead: (story, now) =>
      run(() => {
        db.transaction((tx) => {
          ensureStory(tx, story, now);
          tx.insert(history)
            .values({ storyId: story.id, readAt: now })
            .onConflictDoUpdate({ target: history.storyId, set: { readAt: now } })
            .run();
          // Keep only the newest HISTORY_LIMIT entries.
          tx.run(sql`DELETE FROM history WHERE story_id NOT IN
          (SELECT story_id FROM history ORDER BY read_at DESC LIMIT ${HISTORY_LIMIT})`);
        });
      }),
    clear: () =>
      run(() => {
        db.delete(history).run();
      }),
  };

  const dismissedRepo: DismissedRepository = {
    list: () =>
      run(() =>
        db
          .select({ id: dismissed.storyId })
          .from(dismissed)
          .all()
          .map((r) => r.id),
      ),
    dismiss: (storyId, now) =>
      run(() => {
        db.insert(dismissed).values({ storyId, dismissedAt: now }).onConflictDoNothing().run();
      }),
    clear: () =>
      run(() => {
        db.delete(dismissed).run();
      }),
  };

  /** Queue `op` for a note inside an open transaction, coalescing with any pending entry. */
  function enqueue(
    tx: AppDatabase,
    entityId: string,
    op: OutboxEntry['op'],
    baseVersion: number,
    now: number,
  ) {
    const existingRow = tx.select().from(outbox).where(eq(outbox.entityId, entityId)).get();
    const next = queueChange(existingRow && rowToEntry(existingRow), { entityId, op, baseVersion }, now);
    if (next) {
      const row = entryToRow(next);
      tx.insert(outbox).values(row).onConflictDoUpdate({ target: outbox.entityId, set: row }).run();
    } else if (existingRow) {
      tx.delete(outbox).where(eq(outbox.entityId, entityId)).run();
    }
  }

  const notesRepo: NotesRepository = {
    listForStory: (storyId) =>
      run(() => {
        const rows = db
          .select()
          .from(notes)
          .leftJoin(outbox, eq(outbox.entityId, notes.id))
          .where(eq(notes.storyId, storyId))
          .orderBy(desc(notes.updatedAt))
          .all();
        return rows.map((r) => ({ ...rowToNote(r.notes), sync: syncState(r.outbox ?? undefined) }));
      }),
    get: (id) =>
      run(() => {
        const row = db.select().from(notes).where(eq(notes.id, id)).get();
        return row ? rowToNote(row) : undefined;
      }),
    save: (draft, now) =>
      run(() =>
        db.transaction((tx) => {
          const existing = draft.id ? tx.select().from(notes).where(eq(notes.id, draft.id)).get() : undefined;
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
          const row = { ...note, highlight: note.highlight ?? null };
          tx.insert(notes).values(row).onConflictDoUpdate({ target: notes.id, set: row }).run();
          enqueue(tx, note.id, 'upsert', note.version, now);
          return note;
        }),
      ),
    remove: (id, now) =>
      run(() => {
        db.transaction((tx) => {
          const existing = tx.select().from(notes).where(eq(notes.id, id)).get();
          if (!existing) return;
          tx.delete(notes).where(eq(notes.id, id)).run();
          enqueue(tx, id, 'delete', existing.version, now);
        });
      }),
    applyRemote: (note) =>
      run(() => {
        const row = { ...note, highlight: note.highlight ?? null };
        db.insert(notes).values(row).onConflictDoUpdate({ target: notes.id, set: row }).run();
      }),
    setVersion: (id, version) =>
      run(() => {
        db.update(notes).set({ version }).where(eq(notes.id, id)).run();
      }),
  };

  const outboxRepo: OutboxRepository = {
    list: () => run(() => db.select().from(outbox).orderBy(outbox.createdAt).all().map(rowToEntry)),
    get: (entityId) =>
      run(() => {
        const row = db.select().from(outbox).where(eq(outbox.entityId, entityId)).get();
        return row ? rowToEntry(row) : undefined;
      }),
    put: (entry) =>
      run(() => {
        const row = entryToRow(entry);
        db.insert(outbox).values(row).onConflictDoUpdate({ target: outbox.entityId, set: row }).run();
      }),
    remove: (entityId) =>
      run(() => {
        db.delete(outbox).where(eq(outbox.entityId, entityId)).run();
      }),
  };

  return {
    cache,
    bookmarks: bookmarkRepo,
    history: historyRepo,
    dismissed: dismissedRepo,
    notes: notesRepo,
    outbox: outboxRepo,
  };
}
