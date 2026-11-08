import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Every Hacker News item the app has fetched (stories and comments). It is the
 * offline cache and the single store of story data: bookmarks, history and
 * notes reference rows here by id. `stories_fts` (an FTS5 index over title and
 * text) is kept in sync by triggers defined in a custom migration.
 */
export const items = sqliteTable('items', {
  id: integer('id').primaryKey(),
  type: text('type'),
  by: text('by'),
  time: integer('time'),
  title: text('title'),
  url: text('url'),
  text: text('text'),
  score: integer('score'),
  descendants: integer('descendants'),
  kids: text('kids', { mode: 'json' }).$type<number[]>(),
  parent: integer('parent'),
  deleted: integer('deleted', { mode: 'boolean' }),
  dead: integer('dead', { mode: 'boolean' }),
  fetchedAt: integer('fetched_at').notNull(),
});

/** Last id list fetched per feed, so a feed can be shown offline. */
export const feeds = sqliteTable('feeds', {
  feed: text('feed').primaryKey(),
  ids: text('ids', { mode: 'json' }).$type<number[]>().notNull(),
  fetchedAt: integer('fetched_at').notNull(),
});

export const bookmarks = sqliteTable(
  'bookmarks',
  {
    storyId: integer('story_id').primaryKey(),
    savedAt: integer('saved_at').notNull(),
    /** Comment count last seen by the user or the background job. */
    knownDescendants: integer('known_descendants').notNull().default(0),
  },
  (t) => [index('bookmarks_saved_at_idx').on(t.savedAt)],
);

export const history = sqliteTable(
  'history',
  {
    storyId: integer('story_id').primaryKey(),
    readAt: integer('read_at').notNull(),
  },
  (t) => [index('history_read_at_idx').on(t.readAt)],
);

export const dismissed = sqliteTable('dismissed', {
  storyId: integer('story_id').primaryKey(),
  dismissedAt: integer('dismissed_at').notNull(),
});

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    storyId: integer('story_id').notNull(),
    body: text('body').notNull(),
    highlight: text('highlight'),
    tags: text('tags', { mode: 'json' }).$type<string[]>().notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    /** Server version this row is based on; 0 means it never reached the server. */
    version: integer('version').notNull().default(0),
  },
  (t) => [index('notes_story_idx').on(t.storyId)],
);

/** At most one queued change per entity; see src/shared/sync/outbox.ts for the rules. */
export const outbox = sqliteTable('outbox', {
  entityId: text('entity_id').primaryKey(),
  op: text('op', { enum: ['upsert', 'delete'] }).notNull(),
  baseVersion: integer('base_version').notNull(),
  revision: integer('revision').notNull(),
  attempts: integer('attempts').notNull(),
  nextAttemptAt: integer('next_attempt_at').notNull(),
  status: text('status', { enum: ['pending', 'failed'] }).notNull(),
  lastError: text('last_error'),
  createdAt: integer('created_at').notNull(),
});
