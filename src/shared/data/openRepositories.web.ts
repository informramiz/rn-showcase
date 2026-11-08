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
  const save = (s: MemoryState) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(
      () => void AsyncStorage.setItem(WEB_STORE_KEY, JSON.stringify(serializeMemoryState(s))),
      SAVE_DELAY_MS,
    );
  };
  const repos = createMemoryRepositories(state, newId, save);
  await importLegacyStores(AsyncStorage, repos, Date.now());
  return repos;
}
