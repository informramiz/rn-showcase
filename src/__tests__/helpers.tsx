import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

export const mockFetch = jest.fn<Promise<unknown>, [string, RequestInit?]>();

/** Install the fetch mock. Call from beforeEach. */
export function installFetch(): void {
  mockFetch.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
}

export const ok = (body: unknown) =>
  Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
export const httpError = (status: number) =>
  Promise.resolve({ ok: false, status, json: () => Promise.resolve({}) });

export const itemIdFromUrl = (url: string): number => Number(/item\/(\d+)/.exec(url)?.[1]);

export function newTestClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}

export async function renderWithClient(ui: ReactElement, client: QueryClient = newTestClient()) {
  const utils = await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return { ...utils, client };
}

/** renderHook options wrapping the hook in a QueryClientProvider. */
export function clientWrapper(client: QueryClient = newTestClient()) {
  return function ClientWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
