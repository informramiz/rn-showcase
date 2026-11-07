import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/shared/api';
import { QUERY_CACHE_KEY } from '@/shared/lib/storage';

export const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.kind === 'not_found') return false;
  return failureCount < 2;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 60_000,
        gcTime: CACHE_MAX_AGE_MS,
      },
    },
  });
}

export const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: QUERY_CACHE_KEY,
  throttleTime: 2000,
});

export async function clearQueryCache(client: QueryClient): Promise<void> {
  client.clear();
  await persister.removeClient();
}
