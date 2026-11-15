import AsyncStorage from '@react-native-async-storage/async-storage';
import { newId } from '@/shared/lib/id';
import { importLegacyStores } from './legacyImport';
import {
  createMemoryRepositories,
  deserializeMemoryState,
  emptyMemoryState,
  serializeMemoryState,
  type MemoryState,
  type SerializedMemoryState,
} from './memory/repositories';
import type { Repositories } from './ports';

export const WEB_STORE_KEY = 'hn-reader-db';
const SAVE_DELAY_MS = 500;

/**
 * Web composition: the same repository ports over an in-memory store that is
 * saved to AsyncStorage (localStorage) shortly after each write.
 */
export async function openRepositories(): Promise<Repositories> {
  const raw = await AsyncStorage.getItem(WEB_STORE_KEY);
  const state: MemoryState = raw
    ? deserializeMemoryState(JSON.parse(raw) as SerializedMemoryState)
    : emptyMemoryState();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = false;
  /** Write the store now. Failures are logged and the store stays dirty so the next flush retries. */
  const flush = async (): Promise<void> => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    if (!dirty) return;
    dirty = false;
    try {
      await AsyncStorage.setItem(WEB_STORE_KEY, JSON.stringify(serializeMemoryState(state)));
    } catch (e) {
      dirty = true;
      console.warn('Could not persist the web store', e);
    }
  };
  const save = () => {
    dirty = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(), SAVE_DELAY_MS);
  };
  // A pending debounce must not be lost when the tab is hidden or closed.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush();
    });
  }
  const repos = createMemoryRepositories(state, newId, save);
  // Legacy keys may only be deleted once the imported data is safely stored.
  await importLegacyStores(
    {
      getItem: (key) => AsyncStorage.getItem(key),
      removeItem: async (key) => {
        await flush();
        if (dirty) throw new Error('Imported data was not persisted; keeping legacy keys');
        await AsyncStorage.removeItem(key);
      },
    },
    repos,
    Date.now(),
  );
  return repos;
}
