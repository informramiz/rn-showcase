import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '@/shared/api';
import { QUERY_CACHE_KEY } from '@/shared/lib/storage';
import { clearQueryCache, createQueryClient, shouldRetry } from '@/shared/query/queryClient';

describe('shouldRetry', () => {
  it('never retries a missing item', () => {
    expect(shouldRetry(0, new ApiError('not_found', 'x'))).toBe(false);
  });

  it('retries other failures twice', () => {
    const err = new ApiError('network', 'x');
    expect(shouldRetry(0, err)).toBe(true);
    expect(shouldRetry(1, err)).toBe(true);
    expect(shouldRetry(2, err)).toBe(false);
    expect(shouldRetry(0, new Error('plain'))).toBe(true);
  });

  it('is the default retry policy of the app client', () => {
    expect(createQueryClient().getDefaultOptions().queries?.retry).toBe(shouldRetry);
  });
});

describe('clearQueryCache', () => {
  it('empties the in-memory cache and the persisted copy', async () => {
    const client = createQueryClient();
    client.setQueryData(['item', 1], { id: 1 });
    await AsyncStorage.setItem(QUERY_CACHE_KEY, '{"stale":true}');

    await clearQueryCache(client);

    expect(client.getQueryData(['item', 1])).toBeUndefined();
    expect(await AsyncStorage.getItem(QUERY_CACHE_KEY)).toBeNull();
  });
});
