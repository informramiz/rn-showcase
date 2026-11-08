import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  importLegacyStores,
  LEGACY_BOOKMARKS_KEY,
  LEGACY_HISTORY_KEY,
  LEGACY_QUERY_CACHE_KEY,
} from '@/shared/data/legacyImport';
import { createMemoryRepositories } from '@/shared/data/memory/repositories';

const s = (id: number) => ({ id, title: `S${id}` });

beforeEach(() => AsyncStorage.clear());

it('moves Zustand bookmarks and history into the repositories and removes the keys', async () => {
  await AsyncStorage.setItem(
    LEGACY_BOOKMARKS_KEY,
    JSON.stringify({ state: { items: [s(2), s(1), { bad: 1 }] }, version: 0 }),
  );
  await AsyncStorage.setItem(
    LEGACY_HISTORY_KEY,
    JSON.stringify({
      state: { entries: [{ story: s(3), readAt: 30 }, { story: s(4), readAt: 20 }, { story: 1 }] },
    }),
  );
  await AsyncStorage.setItem(LEGACY_QUERY_CACHE_KEY, '{}');
  const repos = createMemoryRepositories();
  await repos.bookmarks.toggle(s(1), 5);

  expect(await importLegacyStores(AsyncStorage, repos, 100)).toEqual({ bookmarks: 2, history: 2 });
  expect((await repos.bookmarks.list()).map((b) => b.story.id)).toEqual([2, 1]);
  expect(await repos.history.list()).toEqual([
    { story: expect.objectContaining({ id: 3 }) as unknown, readAt: 30 },
    { story: expect.objectContaining({ id: 4 }) as unknown, readAt: 20 },
  ]);
  expect(await AsyncStorage.getAllKeys()).toEqual([]);
});

it('treats missing, malformed and odd-shaped data as empty', async () => {
  const repos = createMemoryRepositories();
  expect(await importLegacyStores(AsyncStorage, repos, 1)).toEqual({ bookmarks: 0, history: 0 });
  await AsyncStorage.setItem(LEGACY_BOOKMARKS_KEY, 'not json');
  await AsyncStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify({ state: null }));
  expect(await importLegacyStores(AsyncStorage, repos, 1)).toEqual({ bookmarks: 0, history: 0 });
  await AsyncStorage.setItem(LEGACY_BOOKMARKS_KEY, JSON.stringify({ state: { items: 'x' } }));
  await AsyncStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify({ state: { entries: 'x' } }));
  expect(await importLegacyStores(AsyncStorage, repos, 1)).toEqual({ bookmarks: 0, history: 0 });
});
