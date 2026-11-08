import type { Note, PushResult, SyncChange, SyncService } from './types';

/** Knobs the Settings screen uses to demo retries against an unreliable network. */
export interface NetworkSimulator {
  isFlaky(): boolean;
  setFlaky(flaky: boolean): void;
}

export interface FakeRemote extends SyncService, NetworkSimulator {
  /** Server-side copy, for tests and to simulate an edit made on another device. */
  readonly store: Map<string, Note>;
}

export interface FakeRemoteOptions {
  random?: () => number;
  /** Failure probability while flaky. */
  flakyFailureRate?: number;
  latencyMs?: number;
}

const FLAKY_FAILURE_RATE = 0.6;

/**
 * In-memory stand-in for a notes API with optimistic concurrency: every write
 * must name the version it was made on, otherwise the server answers with a
 * conflict and its current copy (null when it was deleted).
 */
export function createFakeRemote({
  random = Math.random,
  flakyFailureRate = FLAKY_FAILURE_RATE,
  latencyMs = 0,
}: FakeRemoteOptions = {}): FakeRemote {
  const store = new Map<string, Note>();
  let flaky = false;

  const push = async (change: SyncChange): Promise<PushResult> => {
    if (latencyMs > 0) await new Promise((resolve) => setTimeout(resolve, latencyMs));
    if (flaky && random() < flakyFailureRate) {
      return { kind: 'error', retryable: true, message: 'Network unavailable' };
    }
    const current = store.get(change.entityId);
    const currentVersion = current?.version ?? 0;
    if (change.baseVersion !== currentVersion) return { kind: 'conflict', remote: current ?? null };
    const version = currentVersion + 1;
    if (change.op === 'delete') {
      store.delete(change.entityId);
      return { kind: 'ok', version };
    }
    if (!change.note) return { kind: 'error', retryable: false, message: 'Upsert without a note' };
    store.set(change.entityId, { ...change.note, version });
    return { kind: 'ok', version };
  };

  return {
    store,
    push,
    isFlaky: () => flaky,
    setFlaky: (value) => {
      flaky = value;
    },
  };
}
