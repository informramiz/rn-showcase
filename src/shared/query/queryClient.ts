import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '@/shared/api';

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.kind === 'not_found') return false;
  return failureCount < 2;
}

/**
 * Server-state client. Query functions go through HnSource, which falls back
 * to the SQLite cache, so queries run even when offline ('offlineFirst'
 * makes one attempt instead of pausing) and the cache answers.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry, staleTime: 60_000, networkMode: 'offlineFirst' },
      mutations: { networkMode: 'always' },
    },
  });
}
