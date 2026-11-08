import {
  afterFailure,
  backoffDelay,
  isDue,
  MAX_ATTEMPTS,
  mergeNotes,
  nextAttemptAt,
  normalizeTags,
  queueChange,
  resolveConflict,
  retryNow,
  sameContent,
  summarize,
} from '@/shared/sync/outbox';
import type { Note, OutboxEntry } from '@/shared/sync/types';

const entry = (over: Partial<OutboxEntry> = {}): OutboxEntry => ({
  entityId: 'n1',
  op: 'upsert',
  baseVersion: 0,
  revision: 1,
  attempts: 0,
  nextAttemptAt: 0,
  status: 'pending',
  createdAt: 0,
  ...over,
});
const note = (over: Partial<Note> = {}): Note => ({
  id: 'n1',
  storyId: 1,
  body: 'body',
  tags: [],
  createdAt: 0,
  updatedAt: 0,
  version: 1,
  ...over,
});

describe('queueChange', () => {
  it('creates a pending entry for a new change', () => {
    expect(queueChange(undefined, { entityId: 'n1', op: 'upsert', baseVersion: 0 }, 5)).toEqual(
      entry({ nextAttemptAt: 5, createdAt: 5 }),
    );
  });

  it('ignores deleting a note the server never saw', () => {
    expect(queueChange(undefined, { entityId: 'n1', op: 'delete', baseVersion: 0 }, 5)).toBeUndefined();
    expect(queueChange(entry(), { entityId: 'n1', op: 'delete', baseVersion: 0 }, 5)).toBeUndefined();
  });

  it('queues a delete of a synced note', () => {
    expect(queueChange(undefined, { entityId: 'n1', op: 'delete', baseVersion: 2 }, 5)).toMatchObject({
      op: 'delete',
      baseVersion: 2,
    });
  });

  it('coalesces into the existing entry, keeping its base version and resetting retries', () => {
    const failed = entry({ baseVersion: 2, revision: 3, attempts: 4, status: 'failed', lastError: 'x' });
    expect(queueChange(failed, { entityId: 'n1', op: 'delete', baseVersion: 9 }, 7)).toEqual({
      ...failed,
      op: 'delete',
      revision: 4,
      attempts: 0,
      nextAttemptAt: 7,
      status: 'pending',
      lastError: undefined,
    });
  });
});

describe('backoff and retry', () => {
  it('grows exponentially with full jitter and caps at maxMs', () => {
    const policy = { baseMs: 100, maxMs: 1000 };
    expect(backoffDelay(1, () => 1, policy)).toBe(100);
    expect(backoffDelay(3, () => 1, policy)).toBe(400);
    expect(backoffDelay(10, () => 1, policy)).toBe(1000);
    expect(backoffDelay(3, () => 0.5, policy)).toBe(200);
    expect(backoffDelay(0, () => 1, policy)).toBe(100);
    expect(backoffDelay(3, () => 0)).toBe(0);
  });

  it('schedules a retryable failure', () => {
    expect(afterFailure(entry(), { retryable: true, message: 'offline' }, 1000, () => 1)).toMatchObject({
      attempts: 1,
      status: 'pending',
      nextAttemptAt: 3000,
      lastError: 'offline',
    });
  });

  it('parks non-retryable failures and exhausted entries', () => {
    expect(afterFailure(entry(), { retryable: false, message: '400' }, 1000, () => 1).status).toBe('failed');
    const last = afterFailure(
      entry({ attempts: MAX_ATTEMPTS - 1 }),
      { retryable: true, message: 'x' },
      1,
      () => 1,
    );
    expect(last).toMatchObject({ status: 'failed', attempts: MAX_ATTEMPTS, nextAttemptAt: 0 });
  });

  it('retryNow resets a parked entry', () => {
    expect(retryNow(entry({ status: 'failed', attempts: 6, lastError: 'x' }), 9)).toEqual(
      entry({ nextAttemptAt: 9 }),
    );
  });

  it('knows what is due and when the next attempt is', () => {
    expect(isDue(entry({ nextAttemptAt: 5 }), 5)).toBe(true);
    expect(isDue(entry({ nextAttemptAt: 6 }), 5)).toBe(false);
    expect(isDue(entry({ status: 'failed' }), 5)).toBe(false);
    expect(nextAttemptAt([])).toBeUndefined();
    expect(
      nextAttemptAt([
        entry({ nextAttemptAt: 9 }),
        entry({ nextAttemptAt: 4 }),
        entry({ status: 'failed', nextAttemptAt: 1 }),
      ]),
    ).toBe(4);
  });

  it('summarises pending and failed counts', () => {
    expect(summarize([entry(), entry({ status: 'failed' }), entry()])).toEqual({ pending: 2, failed: 1 });
  });
});

describe('notes merge', () => {
  it('normalises tags', () => {
    expect(normalizeTags([' A ', 'a', '', 'b'])).toEqual(['a', 'b']);
  });

  it('takes text from the newer copy, unions tags and keeps the remote version', () => {
    const local = note({ body: 'local', tags: ['x'], updatedAt: 20, createdAt: 5, version: 1 });
    const remote = note({ body: 'remote', tags: ['y'], updatedAt: 10, createdAt: 3, version: 4 });
    expect(mergeNotes(local, remote)).toEqual({
      ...local,
      tags: ['x', 'y'],
      createdAt: 3,
      updatedAt: 20,
      version: 4,
    });
  });

  it('lets the server win a tie', () => {
    expect(mergeNotes(note({ body: 'l' }), note({ body: 'r' })).body).toBe('r');
  });

  it('compares content', () => {
    expect(sameContent(note(), note({ version: 9 }))).toBe(true);
    expect(sameContent(note(), note({ highlight: 'q' }))).toBe(false);
    expect(sameContent(note({ tags: ['a'] }), note({ tags: ['b'] }))).toBe(false);
    expect(sameContent(note({ tags: ['a'] }), note({ tags: [] }))).toBe(false);
  });
});

describe('resolveConflict', () => {
  const remote = note({ body: 'remote', version: 5, updatedAt: 10 });

  it('lets a remote edit win over a local delete', () => {
    expect(resolveConflict(entry({ op: 'delete' }), undefined, remote)).toEqual({
      kind: 'acceptRemote',
      note: remote,
    });
    expect(resolveConflict(entry({ op: 'delete' }), undefined, null)).toEqual({ kind: 'drop' });
  });

  it('accepts the remote when the local copy is gone', () => {
    expect(resolveConflict(entry(), undefined, remote)).toEqual({ kind: 'acceptRemote', note: remote });
    expect(resolveConflict(entry(), undefined, null)).toEqual({ kind: 'drop' });
  });

  it('re-creates a local edit the server deleted', () => {
    const local = note({ version: 3 });
    expect(resolveConflict(entry(), local, null)).toEqual({
      kind: 'repush',
      note: { ...local, version: 0 },
      baseVersion: 0,
    });
  });

  it('re-pushes a merge that differs from the server', () => {
    const local = note({ body: 'local', updatedAt: 20 });
    expect(resolveConflict(entry(), local, remote)).toMatchObject({
      kind: 'repush',
      baseVersion: 5,
      note: { body: 'local' },
    });
  });

  it('accepts the server copy when the merge adds nothing', () => {
    const local = note({ body: 'old', updatedAt: 1 });
    expect(resolveConflict(entry(), local, remote)).toEqual({ kind: 'acceptRemote', note: remote });
  });
});
