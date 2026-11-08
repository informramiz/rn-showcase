import type { HNItem } from '@/shared/api';
import type { HnSource } from '@/shared/data/hnSource';
import { createMemoryRepositories } from '@/shared/data/memory/repositories';
import { refreshInBackground } from '../refresh';

const story = (id: number, descendants: number): HNItem => ({
  id,
  type: 'story',
  title: `Story ${String(id)}`,
  descendants,
});

function fakeHn(items: Record<number, HNItem | Error>, topFails = false): HnSource & { pages: number } {
  const hn = {
    pages: 0,
    storyIds: () => (topFails ? Promise.reject(new Error('offline')) : Promise.resolve([1, 2])),
    storyPage: () => {
      hn.pages += 1;
      return Promise.resolve([]);
    },
    item: (id: number) => {
      const value = items[id];
      return value instanceof Error || !value
        ? Promise.reject(value ?? new Error('missing'))
        : Promise.resolve(value);
    },
  };
  return hn;
}

describe('refreshInBackground', () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => warn.mockRestore());

  it('prefetches top stories and notifies only about saved stories with more comments', async () => {
    const repos = createMemoryRepositories();
    await repos.bookmarks.toggle({ id: 10, title: 'a', descendants: 5 }, 1);
    await repos.bookmarks.toggle({ id: 11, title: 'b', descendants: 3 }, 1);
    await repos.bookmarks.toggle({ id: 12, title: 'c', descendants: 9 }, 1);
    const hn = fakeHn({ 10: story(10, 8), 11: story(11, 3), 12: story(12, 7) });
    const notify = jest.fn(() => Promise.resolve());

    const updates = await refreshInBackground({ repos, hn }, notify);

    expect(hn.pages).toBe(1);
    expect(updates.map((u) => [u.story.id, u.newComments])).toEqual([[10, 3]]);
    expect(notify).toHaveBeenCalledTimes(1);
    const known = Object.fromEntries(
      (await repos.bookmarks.list()).map((b) => [b.story.id, b.knownDescendants]),
    );
    // Counts that went down (deleted comments) are recorded too, so they are not re-reported later.
    expect(known).toEqual({ 10: 8, 11: 3, 12: 7 });

    // A second run with no changes notifies nothing.
    await expect(refreshInBackground({ repos, hn }, notify)).resolves.toEqual([]);
  });

  it('keeps going when the prefetch or one story fails', async () => {
    const repos = createMemoryRepositories();
    await repos.bookmarks.toggle({ id: 1, title: 'a', descendants: 0 }, 1);
    await repos.bookmarks.toggle({ id: 2, title: 'b', descendants: 0 }, 2);
    const hn = fakeHn({ 1: new Error('boom'), 2: { id: 2, type: 'story', title: 'b' } }, true);
    await expect(refreshInBackground({ repos, hn }, () => Promise.resolve())).resolves.toEqual([]);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
