import { renderHook, waitFor } from '@testing-library/react-native';
import { useItem } from '@/features/story-detail/useItem';
import type { AppServices } from '@/shared/services/AppServices';
import {
  clientWrapper,
  httpError,
  installFetch,
  mockFetch,
  newTestClient,
  newTestServices,
  ok,
} from '../../../__tests__/helpers';

let services: AppServices;
beforeEach(() => {
  installFetch();
  services = newTestServices();
});

async function setup(id: number) {
  const client = newTestClient();
  const { result } = await renderHook(() => useItem(id), { wrapper: clientWrapper(client, services) });
  return { client, result };
}

describe('useItem', () => {
  it('fetches an item, caches it under its key and writes it through to the local store', async () => {
    mockFetch.mockReturnValue(ok({ id: 3, title: 'hello' }));
    const { result, client } = await setup(3);
    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 3, title: 'hello' });
    });
    expect(mockFetch.mock.calls[0]?.[0]).toBe('https://hacker-news.firebaseio.com/v0/item/3.json');
    expect(client.getQueryData(['item', 3])).toEqual({ id: 3, title: 'hello' });
    expect(await services.repos.cache.getItem(3)).toEqual({ id: 3, title: 'hello' });
  });

  it('serves the cached copy when the network is down', async () => {
    await services.repos.cache.putItems([{ id: 4, title: 'cached' }], 1);
    mockFetch.mockRejectedValue(new TypeError('offline'));
    const { result } = await setup(4);
    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 4, title: 'cached' });
    });
  });

  it('surfaces errors when nothing is cached', async () => {
    mockFetch.mockReturnValue(httpError(404));
    const { result } = await setup(4);
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ kind: 'http', status: 404 });
  });
});
