/** @jest-environment node */
import type { HNItem, StorySummary } from '@/shared/api';
import { createMemoryRepositories } from '@/shared/data/memory/repositories';
import { HISTORY_LIMIT, type Repositories } from '@/shared/data/ports';
import { createSqliteRepositories } from '@/shared/data/sqlite/repositories';
import { createTestDb } from './testDb';

const story = (id: number, title = `Story ${id}`, extra: Partial<HNItem> = {}): HNItem => ({
  id,
  type: 'story',
  title,
  by: 'pg',
  time: 1_700_000_000 + id,
  score: id,
  descendants: 0,
  ...extra,
});
const summary = (id: number, title = `Story ${id}`): StorySummary => ({ id, title, descendants: 2 });

function ids() {
  let n = 0;
  return () => `note-${++n}`;
}

const implementations: [string, () => Repositories][] = [
  ['sqlite', () => createSqliteRepositories(createTestDb(), ids())],
  ['memory', () => createMemoryRepositories(undefined, ids())],
];

describe.each(implementations)('%s repositories', (_name, create) => {
  let repos: Repositories;
  beforeEach(() => {
    repos = create();
  });

  describe('item cache', () => {
    it('stores items and returns them in the requested order, skipping misses', async () => {
      await repos.cache.putItems([story(1), story(2), story(3)], 10);
      await repos.cache.putItems([], 10);
      expect((await repos.cache.getItems([3, 99, 1])).map((i) => i.id)).toEqual([3, 1]);
      expect(await repos.cache.getItems([])).toEqual([]);
      expect(await repos.cache.getItem(2)).toEqual(story(2));
      expect(await repos.cache.getItem(99)).toBeUndefined();
    });

    it('round-trips comments with kids and flags', async () => {
      const comment: HNItem = { id: 5, type: 'comment', text: 'hi', parent: 1, kids: [6, 7], dead: true };
      await repos.cache.putItems([comment], 10);
      expect(await repos.cache.getItem(5)).toEqual(comment);
    });

    it('overwrites an item with a fresher copy', async () => {
      await repos.cache.putItems([story(1, 'Old')], 10);
      await repos.cache.putItems([story(1, 'New')], 20);
      expect((await repos.cache.getItem(1))?.title).toBe('New');
    });

    it('stores feed ids per feed', async () => {
      expect(await repos.cache.getFeed('top')).toBeUndefined();
      await repos.cache.putFeed('top', [3, 2, 1], 10);
      await repos.cache.putFeed('top', [4, 3], 20);
      expect(await repos.cache.getFeed('top')).toEqual([4, 3]);
      expect(await repos.cache.getFeed('new')).toBeUndefined();
    });

    it('searches titles and text with prefix matching, title hits first', async () => {
      await repos.cache.putItems(
        [
          story(1, 'Rust in production'),
          story(2, 'Ask HN: what database?', { text: 'We use SQLite and rusty tools' }),
          story(3, 'Unrelated'),
          { id: 4, type: 'comment', text: 'rust comment' },
        ],
        10,
      );
      const hits = await repos.cache.search('rus', 'all');
      expect(hits.map((h) => h.id)).toEqual([1, 2]);
      expect(await repos.cache.search('rust production', 'all')).toHaveLength(1);
      expect(await repos.cache.search('  ', 'all')).toEqual([]);
      expect(await repos.cache.search('"OR*', 'all')).toEqual([]);
    });

    it('limits search to saved stories and caps results', async () => {
      await repos.cache.putItems([story(1, 'Go tips'), story(2, 'Go tricks')], 10);
      await repos.bookmarks.toggle(summary(2, 'Go tricks'), 11);
      expect((await repos.cache.search('go', 'saved')).map((h) => h.id)).toEqual([2]);
      expect(await repos.cache.search('go', 'all', 1)).toHaveLength(1);
    });

    it('keeps the search index in step with updates', async () => {
      await repos.cache.putItems([story(1, 'Kotlin')], 10);
      await repos.cache.putItems([story(1, 'Swift')], 20);
      expect(await repos.cache.search('kotlin', 'all')).toEqual([]);
      expect(await repos.cache.search('swift', 'all')).toHaveLength(1);
    });

    it('prunes old items and feeds but keeps saved, read and annotated stories', async () => {
      await repos.cache.putItems([story(1), story(2), story(3), story(4), story(5)], 10);
      await repos.cache.putFeed('top', [1], 10);
      await repos.cache.putFeed('new', [5], 100);
      await repos.bookmarks.toggle(summary(2), 10);
      await repos.history.markRead(summary(3), 10);
      await repos.notes.save({ storyId: 4, body: 'note', tags: [] }, 10);
      await repos.cache.putItems([story(5)], 100);
      await repos.cache.prune(50);
      expect((await repos.cache.getItems([1, 2, 3, 4, 5])).map((i) => i.id)).toEqual([2, 3, 4, 5]);
      expect(await repos.cache.getFeed('top')).toBeUndefined();
      expect(await repos.cache.getFeed('new')).toEqual([5]);
    });
  });

  describe('bookmarks', () => {
    it('toggles, lists newest first and keeps a summary for uncached stories', async () => {
      expect(await repos.bookmarks.toggle(summary(1), 10)).toBe(true);
      expect(await repos.bookmarks.toggle(summary(2), 20)).toBe(true);
      const list = await repos.bookmarks.list();
      expect(list.map((b) => b.story.id)).toEqual([2, 1]);
      expect(list[0]).toMatchObject({ savedAt: 20, knownDescendants: 2, story: { title: 'Story 2' } });
      expect(await repos.bookmarks.toggle(summary(1), 30)).toBe(false);
      expect((await repos.bookmarks.list()).map((b) => b.story.id)).toEqual([2]);
    });

    it('does not overwrite a fully cached item with summary fields', async () => {
      await repos.cache.putItems([story(1, 'Full', { text: 'body' })], 10);
      await repos.bookmarks.toggle(summary(1, 'Summary'), 20);
      expect((await repos.cache.getItem(1))?.text).toBe('body');
    });

    it('updates known comment counts, removes and clears', async () => {
      await repos.bookmarks.toggle(summary(1), 10);
      await repos.bookmarks.toggle(summary(2), 10);
      await repos.bookmarks.setKnownDescendants(1, 9);
      await repos.bookmarks.setKnownDescendants(99, 9);
      expect((await repos.bookmarks.list()).find((b) => b.story.id === 1)?.knownDescendants).toBe(9);
      await repos.bookmarks.remove(1);
      expect(await repos.bookmarks.list()).toHaveLength(1);
      await repos.bookmarks.clear();
      expect(await repos.bookmarks.list()).toEqual([]);
    });
  });

  describe('history', () => {
    it('moves a re-read story to the top', async () => {
      await repos.history.markRead(summary(1), 10);
      await repos.history.markRead(summary(2), 20);
      await repos.history.markRead(summary(1), 30);
      expect(await repos.history.list()).toEqual([
        { story: expect.objectContaining({ id: 1 }) as unknown, readAt: 30 },
        { story: expect.objectContaining({ id: 2 }) as unknown, readAt: 20 },
      ]);
    });

    it('caps history at HISTORY_LIMIT and clears', async () => {
      for (let i = 1; i <= HISTORY_LIMIT + 2; i++) await repos.history.markRead(summary(i), i);
      const list = await repos.history.list();
      expect(list).toHaveLength(HISTORY_LIMIT);
      expect(list[0]?.story.id).toBe(HISTORY_LIMIT + 2);
      await repos.history.clear();
      expect(await repos.history.list()).toEqual([]);
    });
  });

  describe('dismissed', () => {
    it('dismisses once and clears', async () => {
      await repos.dismissed.dismiss(1, 10);
      await repos.dismissed.dismiss(1, 20);
      await repos.dismissed.dismiss(2, 20);
      expect((await repos.dismissed.list()).sort()).toEqual([1, 2]);
      await repos.dismissed.clear();
      expect(await repos.dismissed.list()).toEqual([]);
    });
  });

  describe('notes and outbox', () => {
    it('saves a note, normalises it and queues an upsert atomically', async () => {
      const note = await repos.notes.save(
        { storyId: 1, body: '  Great  ', highlight: '  ', tags: ['Rust', 'rust', ' perf '] },
        10,
      );
      expect(note).toEqual({
        id: 'note-1',
        storyId: 1,
        body: 'Great',
        highlight: undefined,
        tags: ['rust', 'perf'],
        createdAt: 10,
        updatedAt: 10,
        version: 0,
      });
      expect(await repos.notes.get('note-1')).toEqual(note);
      expect(await repos.outbox.list()).toEqual([
        expect.objectContaining({ entityId: 'note-1', op: 'upsert', baseVersion: 0, revision: 1 }),
      ]);
      expect((await repos.notes.listForStory(1))[0]?.sync).toBe('pending');
    });

    it('coalesces edits into one entry and keeps createdAt', async () => {
      const { id } = await repos.notes.save({ storyId: 1, body: 'a', highlight: 'quote', tags: [] }, 10);
      const edited = await repos.notes.save({ id, storyId: 1, body: 'b', highlight: 'quote', tags: [] }, 20);
      expect(edited).toMatchObject({ body: 'b', highlight: 'quote', createdAt: 10, updatedAt: 20 });
      const entries = await repos.outbox.list();
      expect(entries).toHaveLength(1);
      expect(entries[0]?.revision).toBe(2);
    });

    it('drops the outbox entry when an unsynced note is deleted', async () => {
      const { id } = await repos.notes.save({ storyId: 1, body: 'a', tags: [] }, 10);
      await repos.notes.remove(id, 20);
      await repos.notes.remove('missing', 20);
      expect(await repos.notes.get(id)).toBeUndefined();
      expect(await repos.outbox.list()).toEqual([]);
    });

    it('queues a delete for a synced note and reports sync state', async () => {
      const { id } = await repos.notes.save({ storyId: 1, body: 'a', tags: [] }, 10);
      await repos.notes.setVersion(id, 3);
      await repos.notes.setVersion('missing', 3);
      await repos.outbox.remove(id);
      expect((await repos.notes.listForStory(1))[0]?.sync).toBe('synced');
      await repos.notes.remove(id, 20);
      expect(await repos.outbox.get(id)).toMatchObject({ op: 'delete', baseVersion: 3 });
    });

    it('stores remote copies without queueing, lists newest first, marks failed', async () => {
      await repos.notes.applyRemote({
        id: 'r1',
        storyId: 1,
        body: 'remote',
        tags: ['x'],
        createdAt: 1,
        updatedAt: 1,
        version: 2,
      });
      const local = await repos.notes.save({ storyId: 1, body: 'local', tags: [] }, 10);
      const entry = await repos.outbox.get(local.id);
      if (!entry) throw new Error('missing entry');
      await repos.outbox.put({ ...entry, status: 'failed', lastError: 'boom' });
      expect(await repos.outbox.get(local.id)).toMatchObject({ status: 'failed', lastError: 'boom' });
      const list = await repos.notes.listForStory(1);
      expect(list.map((n) => [n.id, n.sync])).toEqual([
        [local.id, 'failed'],
        ['r1', 'synced'],
      ]);
      expect(await repos.notes.listForStory(2)).toEqual([]);
    });
  });
});
