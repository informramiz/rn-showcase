import { createContext, useContext, type ReactNode } from 'react';
import type { HnSource } from '@/shared/data/hnSource';
import type { Repositories } from '@/shared/data/ports';

/**
 * Everything features need from outside React, created once in the
 * composition root (app/_layout.tsx) and passed down by context, so tests
 * can swap any piece for a fake.
 */
export interface AppServices {
  repos: Repositories;
  hn: HnSource;
  now: () => number;
}

const ServicesContext = createContext<AppServices | null>(null);

export function ServicesProvider({ services, children }: { services: AppServices; children: ReactNode }) {
  return <ServicesContext value={services}>{children}</ServicesContext>;
}

export function useServices(): AppServices {
  const services = useContext(ServicesContext);
  if (!services) throw new Error('useServices must be used inside <ServicesProvider>');
  return services;
}
