import { ApiError, PAGE_SIZE, type HNItem } from '@/shared/api';
import { canServeFromCache, createHnSource, type HnApi } from '@/shared/data/hnSource';
import { createMemoryRepositories } from '@/shared/data/memory/repositories';

const story = (id: number, extra: Partial<HNItem> = {}): HNItem => ({
  id,
  type: 'story',
  title: `S${id}`,
  ...extra,
});

function setup(api: Partial<HnApi> = {}) {
  const fail = () => Promise.reject(new ApiError('network', 'down'));
  const full: HnApi = { fetchStoryIds: fail, fetchItem: fail, fetchItems: fail, ...api };
  const repos = createMemoryRepositories();
  return { repos, source: createHnSource(repos.cache, full, () => 42) };
}

describe('canServeFromCache', () => {
  it('falls back on transport failures only', () => {
    expect(canServeFromCache(new ApiError('network', 'x'))).toBe(true);
    expect(canServeFromCache(new ApiError('timeout', 'x'))).toBe(true);
    expect(canServeFromCache(new ApiError('http', 'x', 503))).toBe(true);
    expect(canServeFromCache(new ApiError('not_found', 'x'))).toBe(false);
    expect(canServeFromCache(new ApiError('parse', 'x'))).toBe(false);
    expect(canServeFromCache(new Error('x'))).toBe(false);
  });
});

describe('createHnSource', () => {
  it('writes fresh feeds through and serves them when offline', async () => {
    const { repos, source } = setup({ fetchStoryIds: () => Promise.resolve([1, 2]) });
    expect(await source.storyIds('top')).toEqual([1, 2]);
    expect(await repos.cache.getFeed('top')).toEqual([1, 2]);
    const offline = createHnSource(repos.cache, {
      fetchStoryIds: () => Promise.reject(new ApiError('timeout', 't')),
      fetchItem: jest.fn(),
      fetchItems: jest.fn(),
    });
    expect(await offline.storyIds('top')).toEqual([1, 2]);
  });

  it('rethrows the network error when nothing is cached', async () => {
    const { source } = setup();
    await expect(source.storyIds('new')).rejects.toMatchObject({ kind: 'network' });
    await expect(source.item(9)).rejects.toMatchObject({ kind: 'network' });
    await expect(source.storyPage([1, 2], 0)).rejects.toMatchObject({ kind: 'network' });
  });

  it('does not hide real answers behind the cache', async () => {
    const { repos, source } = setup({ fetchItem: () => Promise.reject(new ApiError('not_found', 'gone')) });
    await repos.cache.putItems([story(5)], 1);
    await expect(source.item(5)).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('pages, filters unlistable items and falls back to cached pages', async () => {
    const ids = Array.from({ length: PAGE_SIZE + 3 }, (_, i) => i + 1);
    const fetchItems = jest.fn((page: number[]) =>
      Promise.resolve(page.map((id) => (id === 2 ? story(id, { dead: true }) : story(id)))),
    );
    const { repos, source } = setup({ fetchItems });
    const first = await source.storyPage(ids, 0);
    expect(fetchItems).toHaveBeenCalledWith(ids.slice(0, PAGE_SIZE), undefined);
    expect(first.map((s) => s.id)).not.toContain(2);
    expect(first).toHaveLength(PAGE_SIZE - 1);

    const offline = createHnSource(repos.cache, {
      fetchStoryIds: jest.fn(),
      fetchItem: jest.fn(),
      fetchItems: () => Promise.reject(new ApiError('network', 'down')),
    });
    expect((await offline.storyPage(ids, 0)).map((s) => s.id)).toEqual(first.map((s) => s.id));
  });

  it('serves single items from the cache when offline', async () => {
    const { repos, source } = setup();
    await repos.cache.putItems([story(7)], 1);
    expect(await source.item(7)).toMatchObject({ id: 7 });
  });

  it('still returns fresh data when the cache write fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { repos, source } = setup({ fetchItem: () => Promise.resolve(story(8)) });
    jest.spyOn(repos.cache, 'putItems').mockRejectedValue(new Error('disk full'));
    expect(await source.item(8)).toMatchObject({ id: 8 });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
