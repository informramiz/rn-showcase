import { createHnSource } from '@/shared/data/hnSource';
import { openRepositories } from '@/shared/data/openRepositories';
import type { Repositories } from '@/shared/data/ports';
import type { AppServices } from './AppServices';

/** Composition root: wire the concrete adapters together. */
export function createServices(repos: Repositories, now: () => number = Date.now): AppServices {
  return { repos, hn: createHnSource(repos.cache, undefined, now), now };
}

export async function createAppServices(): Promise<AppServices> {
  return createServices(await openRepositories());
}
