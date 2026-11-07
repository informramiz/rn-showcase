import { ApiError, fetchItem, fetchItems, fetchStoryIds } from '../api';

const mockFetch = jest.fn();
beforeEach(() => {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

describe('api layer', () => {
  it('fetches story ids from the right endpoint', async () => {
    mockFetch.mockResolvedValue(ok([1, 2, 3]));
    await expect(fetchStoryIds('best')).resolves.toEqual([1, 2, 3]);
    expect(mockFetch.mock.calls[0][0]).toBe('https://hacker-news.firebaseio.com/v0/beststories.json');
  });

  it('rejects a non-array ids payload with a parse error', async () => {
    mockFetch.mockResolvedValue(ok(null));
    await expect(fetchStoryIds('top')).rejects.toMatchObject({ kind: 'parse' });
  });

  it('maps a null item to not_found', async () => {
    mockFetch.mockResolvedValue(ok(null));
    await expect(fetchItem(9)).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('maps non-2xx to an http error with status', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await expect(fetchItem(1)).rejects.toMatchObject({ kind: 'http', status: 503 });
  });

  it('maps a rejected fetch to a network error', async () => {
    mockFetch.mockRejectedValue(new TypeError('Network request failed'));
    const err = await fetchItem(1).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe('network');
  });

  it('maps invalid JSON to a parse error', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('bad');
      },
    });
    await expect(fetchItem(1)).rejects.toMatchObject({ kind: 'parse' });
  });

  it('times out slow requests', async () => {
    jest.useFakeTimers();
    mockFetch.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(new Error('aborted')));
        }),
    );
    const p = fetchItem(1).catch((e) => e);
    await jest.advanceTimersByTimeAsync(10_001);
    const err = await p;
    jest.useRealTimers();
    expect(err.kind).toBe('timeout');
  });

  it('fetchItems keeps order, drops individual failures', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/item/2.json')) throw new TypeError('fail');
      const id = Number(/item\/(\d+)/.exec(url)?.[1]);
      return ok({ id, title: `t${id}` });
    });
    const items = await fetchItems([1, 2, 3]);
    expect(items.map((i) => i.id)).toEqual([1, 3]);
  });

  it('fetchItems throws when every item fails', async () => {
    mockFetch.mockRejectedValue(new TypeError('down'));
    await expect(fetchItems([1, 2])).rejects.toMatchObject({ kind: 'network' });
  });

  it('fetchItems batches requests', async () => {
    let inFlight = 0;
    let peak = 0;
    mockFetch.mockImplementation(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return ok({ id: 1 });
    });
    await fetchItems(Array.from({ length: 25 }, (_, i) => i + 1));
    expect(peak).toBeLessThanOrEqual(10);
    expect(mockFetch).toHaveBeenCalledTimes(25);
  });
});
