import { createMemoryRepositories } from '@/shared/data/memory/repositories';
import type { Repositories } from '@/shared/data/ports';
import { createFakeRemote, type FakeRemote } from '../fakeRemote';
import { MAX_ATTEMPTS } from '../outbox';
import { createSyncEngine, type SyncEngine } from '../syncEngine';
import type { SyncService } from '../types';

let t: number;
let repos: Repositories;
let remote: FakeRemote;
let timers: { run: () => void; delayMs: number; cancelled: boolean }[];
let ids: number;

function engineWith(service: SyncService = remote): SyncEngine {
  return createSyncEngine({
    outbox: repos.outbox,
    notes: repos.notes,
    remote: service,
    now: () => t,
    random: () => 0.5,
    schedule: (run, delayMs) => {
      const timer = { run, delayMs, cancelled: false };
      timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
  });
}

const draft = (body: string, tags: string[] = []) => ({ storyId: 7, body, tags });

beforeEach(() => {
  t = 1_000;
  ids = 0;
  timers = [];
  repos = createMemoryRepositories(undefined, () => `n${String((ids += 1))}`);
  // Flaky means every push fails (random 0.5 < rate 1).
  remote = createFakeRemote({ random: () => 0.5, flakyFailureRate: 1 });
});

describe('createSyncEngine', () => {
  it('pushes new notes, records the server version and empties the outbox', async () => {
    const engine = engineWith();
    const note = await repos.notes.save(draft('first'), t);

    await expect(engine.syncNow()).resolves.toEqual({ pending: 0, failed: 0 });
    expect(remote.store.get(note.id)).toMatchObject({ body: 'first', version: 1 });
    expect(await repos.notes.get(note.id)).toMatchObject({ version: 1 });
    expect(await repos.notes.listForStory(7)).toEqual([expect.objectContaining({ sync: 'synced' })]);
    expect(timers).toHaveLength(0);
  });

  it('pushes edits on top of the known version and deletes', async () => {
    const engine = engineWith();
    const note = await repos.notes.save(draft('v1'), t);
    await engine.syncNow();
    await repos.notes.save({ ...draft('v2'), id: note.id }, (t += 10));
    await engine.syncNow();
    expect(remote.store.get(note.id)).toMatchObject({ body: 'v2', version: 2 });

    await repos.notes.remove(note.id, (t += 10));
    await engine.syncNow();
    expect(remote.store.has(note.id)).toBe(false);
    expect(await repos.outbox.list()).toEqual([]);
  });

  it('backs off on failure, wakes up on the timer and succeeds once the network is back', async () => {
    const engine = engineWith();
    const note = await repos.notes.save(draft('offline'), t);
    remote.setFlaky(true);

    await expect(engine.syncNow()).resolves.toEqual({ pending: 1, failed: 0 });
    const entry = await repos.outbox.get(note.id);
    expect(entry).toMatchObject({ attempts: 1, lastError: 'Network unavailable' });
    // Full jitter with random 0.5: half of the 2s base.
    expect(entry?.nextAttemptAt).toBe(t + 1_000);
    expect(timers.at(-1)?.delayMs).toBe(1_000);

    // Not due yet: nothing is pushed.
    remote.setFlaky(false);
    await engine.syncNow();
    expect(remote.store.size).toBe(0);

    t += 1_000;
    timers.at(-1)?.run();
    await engine.syncNow();
    expect(remote.store.get(note.id)?.version).toBe(1);
    expect(await repos.outbox.list()).toEqual([]);
  });

  it('parks a change after MAX_ATTEMPTS and retries it on request', async () => {
    const engine = engineWith();
    const note = await repos.notes.save(draft('stuck'), t);
    remote.setFlaky(true);
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await engine.syncNow();
      t += 10 * 60_000;
    }
    expect(await engine.status()).toEqual({ pending: 0, failed: 1 });
    expect(await repos.notes.listForStory(7)).toEqual([expect.objectContaining({ sync: 'failed' })]);

    remote.setFlaky(false);
    await expect(engine.retryFailed()).resolves.toEqual({ pending: 0, failed: 0 });
    expect(remote.store.get(note.id)?.body).toBe('stuck');
  });

  it('parks non-retryable errors straight away', async () => {
    const engine = engineWith({
      push: () => Promise.resolve({ kind: 'error', retryable: false, message: 'Forbidden' }),
    });
    await repos.notes.save(draft('x'), t);
    await expect(engine.syncNow()).resolves.toEqual({ pending: 0, failed: 1 });
  });

  it('treats a throwing remote as a retryable error', async () => {
    const engine = engineWith({ push: () => Promise.reject(new Error('socket closed')) });
    const note = await repos.notes.save(draft('x'), t);
    await engine.syncNow();
    expect(await repos.outbox.get(note.id)).toMatchObject({ status: 'pending', lastError: 'socket closed' });
  });

  it('merges a concurrent remote edit and re-pushes the merge in the same run', async () => {
    const engine = engineWith();
    const note = await repos.notes.save(draft('mine', ['rust']), t);
    await engine.syncNow();
    // Another device edits first (older text, new tag).
    remote.store.set(note.id, { ...note, body: 'theirs', tags: ['compilers'], updatedAt: t + 5, version: 2 });
    await repos.notes.save({ ...draft('mine, edited', ['rust']), id: note.id }, (t += 10));

    await engine.syncNow();
    const server = remote.store.get(note.id);
    expect(server).toMatchObject({ body: 'mine, edited', tags: ['rust', 'compilers'], version: 3 });
    expect(await repos.notes.get(note.id)).toMatchObject({ body: 'mine, edited', version: 3 });
    expect(await repos.outbox.list()).toEqual([]);
  });

  it('accepts the remote copy when the merge adds nothing', async () => {
    const engine = engineWith();
    const note = await repos.notes.save(draft('a'), t);
    await engine.syncNow();
    remote.store.set(note.id, { ...note, body: 'newer remote', updatedAt: t + 50, version: 2 });
    await repos.notes.save({ ...draft('a'), id: note.id }, (t += 10));

    await engine.syncNow();
    expect(await repos.notes.get(note.id)).toMatchObject({ body: 'newer remote', version: 2 });
    expect(remote.store.get(note.id)?.version).toBe(2);
  });

  it('keeps a remote edit over a local delete', async () => {
    const engine = engineWith();
    const note = await repos.notes.save(draft('a'), t);
    await engine.syncNow();
    remote.store.set(note.id, { ...note, body: 'edited elsewhere', version: 2 });
    await repos.notes.remove(note.id, (t += 10));

    await engine.syncNow();
    expect(await repos.notes.get(note.id)).toMatchObject({ body: 'edited elsewhere' });
  });

  it('re-creates a note that was deleted remotely while edited locally', async () => {
    const engine = engineWith();
    const note = await repos.notes.save(draft('a'), t);
    await engine.syncNow();
    remote.store.delete(note.id);
    await repos.notes.save({ ...draft('still want it'), id: note.id }, (t += 10));

    await engine.syncNow();
    expect(remote.store.get(note.id)).toMatchObject({ body: 'still want it', version: 1 });
  });

  it('drops an upsert whose note no longer exists', async () => {
    const engine = engineWith();
    await repos.outbox.put({
      entityId: 'ghost',
      op: 'upsert',
      baseVersion: 0,
      revision: 1,
      attempts: 0,
      nextAttemptAt: t,
      status: 'pending',
      createdAt: t,
    });
    await engine.syncNow();
    expect(await repos.outbox.list()).toEqual([]);
  });

  it('keeps an edit made while the push was in flight and pushes it next', async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const slow: SyncService = {
      push: async (change) => {
        await gate;
        return remote.push(change);
      },
    };
    const engine = engineWith(slow);
    const note = await repos.notes.save(draft('v1'), t);
    const first = engine.syncNow();
    // Same run is shared.
    expect(engine.syncNow()).toBe(first);
    await Promise.resolve();
    await repos.notes.save({ ...draft('v2'), id: note.id }, (t += 10));
    release();
    await first;

    expect(remote.store.get(note.id)).toMatchObject({ body: 'v2', version: 2 });
    expect(await repos.outbox.list()).toEqual([]);
  });

  it('notifies subscribers after each run and stops after dispose', async () => {
    const engine = engineWith();
    const listener = jest.fn();
    const unsubscribe = engine.subscribe(listener);
    await engine.syncNow();
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    await engine.syncNow();
    expect(listener).toHaveBeenCalledTimes(1);

    await repos.notes.save(draft('x'), t);
    remote.setFlaky(true);
    await engine.syncNow();
    const timer = timers.at(-1);
    engine.dispose();
    expect(timer?.cancelled).toBe(true);
  });

  it('kick logs instead of throwing when the store fails', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(repos.outbox, 'list').mockRejectedValueOnce(new Error('disk full'));
    const engine = engineWith();
    engine.kick();
    await new Promise((resolve) => setImmediate(resolve));
    expect(warn).toHaveBeenCalledWith('Note sync failed', expect.any(Error));
    warn.mockRestore();
  });
});

describe('createFakeRemote', () => {
  it('rejects a write on a stale version with the current copy', async () => {
    const note = { id: 'a', storyId: 1, body: 'x', tags: [], createdAt: 1, updatedAt: 1, version: 0 };
    await expect(remote.push({ op: 'upsert', entityId: 'a', baseVersion: 0, note })).resolves.toEqual({
      kind: 'ok',
      version: 1,
    });
    await expect(remote.push({ op: 'upsert', entityId: 'a', baseVersion: 0, note })).resolves.toEqual({
      kind: 'conflict',
      remote: { ...note, version: 1 },
    });
    await expect(remote.push({ op: 'delete', entityId: 'b', baseVersion: 3 })).resolves.toEqual({
      kind: 'conflict',
      remote: null,
    });
    await expect(remote.push({ op: 'upsert', entityId: 'c', baseVersion: 0 })).resolves.toMatchObject({
      kind: 'error',
      retryable: false,
    });
  });

  it('fails only while flaky and waits for the simulated latency', async () => {
    jest.useFakeTimers();
    const slow = createFakeRemote({ latencyMs: 100, random: () => 0.1 });
    expect(slow.isFlaky()).toBe(false);
    slow.setFlaky(true);
    expect(slow.isFlaky()).toBe(true);
    const result = slow.push({ op: 'delete', entityId: 'x', baseVersion: 0 });
    await jest.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toMatchObject({ kind: 'error', retryable: true });
    jest.useRealTimers();
  });
});
