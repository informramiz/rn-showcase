import { createHnSource } from '@/shared/data/hnSource';
import { openRepositories } from '@/shared/data/openRepositories';
import type { Repositories } from '@/shared/data/ports';
import { createFakeRemote } from '@/shared/sync/fakeRemote';
import { createSyncEngine, type Schedule } from '@/shared/sync/syncEngine';
import type { AppServices } from './AppServices';

export interface ServiceOptions {
  now?: () => number;
  random?: () => number;
  /** Simulated round trip of the fake notes server. */
  remoteLatencyMs?: number;
  schedule?: Schedule;
}

const DEMO_LATENCY_MS = 400;

/** Composition root: wire the concrete adapters together. */
export function createServices(repos: Repositories, options: ServiceOptions = {}): AppServices {
  const { now = Date.now, random = Math.random, remoteLatencyMs = 0, schedule } = options;
  const remote = createFakeRemote({ random, latencyMs: remoteLatencyMs });
  const sync = createSyncEngine({ outbox: repos.outbox, notes: repos.notes, remote, now, random, schedule });
  return { repos, hn: createHnSource(repos.cache, undefined, now), now, sync, network: remote };
}

export async function createAppServices(): Promise<AppServices> {
  const services = createServices(await openRepositories(), { remoteLatencyMs: DEMO_LATENCY_MS });
  services.sync.kick();
  return services;
}
