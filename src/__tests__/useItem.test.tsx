import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useItem } from '../hooks/useItem';
import { httpError, installFetch, mockFetch, newTestClient, ok } from './helpers';

beforeEach(installFetch);

async function setup(id: number) {
  const client = newTestClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const { result } = await renderHook(() => useItem(id), { wrapper });
  return { client, result };
}

describe('useItem', () => {
  it('fetches an item and caches it under its key', async () => {
    mockFetch.mockReturnValue(ok({ id: 3, title: 'hello' }));
    const { result, client } = await setup(3);
    await waitFor(() => {
      expect(result.current.data).toEqual({ id: 3, title: 'hello' });
    });
    expect(mockFetch.mock.calls[0]?.[0]).toBe('https://hacker-news.firebaseio.com/v0/item/3.json');
    expect(client.getQueryData(['item', 3])).toEqual({ id: 3, title: 'hello' });
  });

  it('surfaces errors', async () => {
    mockFetch.mockReturnValue(httpError(404));
    const { result } = await setup(4);
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
    expect(result.current.error).toMatchObject({ kind: 'http', status: 404 });
  });
});
