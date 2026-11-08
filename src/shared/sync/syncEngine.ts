import type { NotesRepository, OutboxRepository } from '@/shared/data/ports';
import { afterFailure, isDue, nextAttemptAt, resolveConflict, retryNow, summarize } from './outbox';
import type { OutboxEntry, PushResult, SyncService, SyncStatus } from './types';

export type Schedule = (run: () => void, delayMs: number) => () => void;

export interface SyncEngineDeps {
  outbox: OutboxRepository;
  notes: NotesRepository;
  remote: SyncService;
  now: () => number;
  random: () => number;
  /** Timer used to wake up for the next backoff attempt. Injected so tests stay deterministic. */
  schedule?: Schedule;
}

export interface SyncEngine {
  /** Push every due change. Concurrent calls share one run. */
  syncNow(): Promise<SyncStatus>;
  /** Fire-and-forget syncNow, for UI events and app start. */
  kick(): void;
  /** Move parked (failed) changes back to pending and sync. */
  retryFailed(): Promise<SyncStatus>;
  status(): Promise<SyncStatus>;
  /** Called after every run that may have changed notes or the outbox. */
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

/** A conflict that ends in a re-push gets another go in the same run, up to this many passes. */
const MAX_PASSES = 3;

const defaultSchedule: Schedule = (run, delayMs) => {
  const handle = setTimeout(run, delayMs);
  return () => clearTimeout(handle);
};

/**
 * Drains the outbox to the remote. The rules (backoff, conflicts) live in the
 * pure `outbox` module; this class only does the I/O around them.
 */
export function createSyncEngine({
  outbox,
  notes,
  remote,
  now,
  random,
  schedule = defaultSchedule,
}: SyncEngineDeps): SyncEngine {
  const listeners = new Set<() => void>();
  let running: Promise<SyncStatus> | null = null;
  let cancelTimer: (() => void) | null = null;
  let disposed = false;

  const pushSafely = async (entry: OutboxEntry): Promise<PushResult> => {
    const note = entry.op === 'upsert' ? await notes.get(entry.entityId) : undefined;
    try {
      return await remote.push({
        op: entry.op,
        entityId: entry.entityId,
        baseVersion: entry.baseVersion,
        note,
      });
    } catch (e) {
      return { kind: 'error', retryable: true, message: e instanceof Error ? e.message : String(e) };
    }
  };

  /** Returns true when the entry should be pushed again in this run. */
  const process = async (entry: OutboxEntry): Promise<boolean> => {
    if (entry.op === 'upsert' && !(await notes.get(entry.entityId))) {
      await outbox.remove(entry.entityId);
      return false;
    }
    const result = await pushSafely(entry);
    // The user may have edited the note while the push was in flight.
    const current = await outbox.get(entry.entityId);
    const changedMeanwhile = current !== undefined && current.revision !== entry.revision;

    switch (result.kind) {
      case 'ok':
        if (entry.op === 'upsert') await notes.setVersion(entry.entityId, result.version);
        if (changedMeanwhile) await outbox.put({ ...current, baseVersion: result.version });
        else await outbox.remove(entry.entityId);
        return changedMeanwhile;
      case 'error':
        if (!changedMeanwhile) await outbox.put(afterFailure(entry, result, now(), random));
        return false;
      case 'conflict': {
        if (changedMeanwhile) return true;
        const resolution = resolveConflict(entry, await notes.get(entry.entityId), result.remote);
        if (resolution.kind === 'drop') {
          await outbox.remove(entry.entityId);
          return false;
        }
        await notes.applyRemote(resolution.note);
        if (resolution.kind === 'acceptRemote') {
          await outbox.remove(entry.entityId);
          return false;
        }
        await outbox.put({
          ...entry,
          op: 'upsert',
          baseVersion: resolution.baseVersion,
          attempts: 0,
          nextAttemptAt: now(),
        });
        return true;
      }
    }
  };

  const scheduleNext = (entries: readonly OutboxEntry[]) => {
    cancelTimer?.();
    cancelTimer = null;
    const at = nextAttemptAt(entries);
    if (at === undefined || disposed) return;
    cancelTimer = schedule(() => engine.kick(), Math.max(0, at - now()));
  };

  const run = async (): Promise<SyncStatus> => {
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const due = (await outbox.list()).filter((e) => isDue(e, now()));
      if (due.length === 0) break;
      let again = false;
      for (const entry of due) again = (await process(entry)) || again;
      if (!again) break;
    }
    const entries = await outbox.list();
    scheduleNext(entries);
    for (const listener of listeners) listener();
    return summarize(entries);
  };

  const engine: SyncEngine = {
    syncNow: () => {
      running ??= run().finally(() => {
        running = null;
      });
      return running;
    },
    kick: () => {
      engine.syncNow().catch((e: unknown) => {
        console.warn('Note sync failed', e);
      });
    },
    retryFailed: async () => {
      const at = now();
      for (const entry of await outbox.list()) {
        if (entry.status === 'failed') await outbox.put(retryNow(entry, at));
      }
      return engine.syncNow();
    },
    status: async () => summarize(await outbox.list()),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose: () => {
      disposed = true;
      cancelTimer?.();
      cancelTimer = null;
      listeners.clear();
    },
  };
  return engine;
}
