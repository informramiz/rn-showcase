import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { createMemoryRepositories } from '@/shared/data/memory/repositories';
import { ServicesProvider, type AppServices } from '@/shared/services/AppServices';
import { createServices } from '@/shared/services/createAppServices';

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
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, networkMode: 'offlineFirst' } },
  });
}

/** Real services over the in-memory store, with a fixed clock that ticks on each call. */
export function newTestServices(start = 1_000): AppServices {
  let t = start;
  return createServices(createMemoryRepositories(), () => (t += 1));
}

function Providers({
  client,
  services,
  children,
}: {
  client: QueryClient;
  services: AppServices;
  children: ReactNode;
}) {
  return (
    <ServicesProvider services={services}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ServicesProvider>
  );
}

export async function renderWithClient(
  ui: ReactElement,
  client: QueryClient = newTestClient(),
  services: AppServices = newTestServices(),
) {
  const utils = await render(
    <Providers client={client} services={services}>
      {ui}
    </Providers>,
  );
  return { ...utils, client, services };
}

/** renderHook wrapper providing a QueryClient and the app services. */
export function clientWrapper(
  client: QueryClient = newTestClient(),
  services: AppServices = newTestServices(),
) {
  return function ClientWrapper({ children }: { children: ReactNode }) {
    return (
      <Providers client={client} services={services}>
        {children}
      </Providers>
    );
  };
}
