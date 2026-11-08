/**
 * Pure outbox rules: how local changes are queued and coalesced, when a failed
 * push is retried (exponential backoff with full jitter) and how a conflict
 * with the server copy is resolved. No I/O; time and randomness are passed in.
 */
import type { LocalChange, Note, OutboxEntry, SyncStatus } from './types';

export const MAX_ATTEMPTS = 6;

export interface BackoffPolicy {
  baseMs: number;
  maxMs: number;
}

export const DEFAULT_BACKOFF: BackoffPolicy = { baseMs: 2_000, maxMs: 5 * 60_000 };

/**
 * Merge a new local change into the entity's existing entry (if any).
 * Returns `undefined` when nothing needs to reach the server, e.g. a note
 * created and deleted before it was ever pushed.
 */
export function queueChange(
  existing: OutboxEntry | undefined,
  change: LocalChange,
  now: number,
): OutboxEntry | undefined {
  if (!existing) {
    if (change.op === 'delete' && change.baseVersion === 0) return undefined;
    return {
      entityId: change.entityId,
      op: change.op,
      baseVersion: change.baseVersion,
      revision: 1,
      attempts: 0,
      nextAttemptAt: now,
      status: 'pending',
      createdAt: now,
    };
  }
  if (change.op === 'delete' && existing.baseVersion === 0) return undefined;
  // Keep the entry's base version: it is the last server version this device knows.
  return {
    ...existing,
    op: change.op,
    revision: existing.revision + 1,
    attempts: 0,
    nextAttemptAt: now,
    status: 'pending',
    lastError: undefined,
  };
}

/** Exponential backoff with full jitter (AWS Architecture Blog, "Exponential Backoff and Jitter"). */
export function backoffDelay(attempts: number, random: () => number, policy = DEFAULT_BACKOFF): number {
  const ceiling = Math.min(policy.maxMs, policy.baseMs * 2 ** Math.max(0, attempts - 1));
  return Math.round(random() * ceiling);
}

export function isDue(entry: OutboxEntry, now: number): boolean {
  return entry.status === 'pending' && entry.nextAttemptAt <= now;
}

/** Schedule the next attempt, or park the entry when it is not retryable or out of attempts. */
export function afterFailure(
  entry: OutboxEntry,
  failure: { retryable: boolean; message: string },
  now: number,
  random: () => number,
  policy = DEFAULT_BACKOFF,
): OutboxEntry {
  const attempts = entry.attempts + 1;
  const park = !failure.retryable || attempts >= MAX_ATTEMPTS;
  return {
    ...entry,
    attempts,
    lastError: failure.message,
    status: park ? 'failed' : 'pending',
    nextAttemptAt: park ? entry.nextAttemptAt : now + backoffDelay(attempts, random, policy),
  };
}

export function retryNow(entry: OutboxEntry, now: number): OutboxEntry {
  return { ...entry, status: 'pending', attempts: 0, nextAttemptAt: now, lastError: undefined };
}

/** Earliest time a pending entry becomes due, for scheduling the next run. */
export function nextAttemptAt(entries: readonly OutboxEntry[]): number | undefined {
  let next: number | undefined;
  for (const e of entries) {
    if (e.status === 'pending' && (next === undefined || e.nextAttemptAt < next)) next = e.nextAttemptAt;
  }
  return next;
}

export function summarize(entries: readonly OutboxEntry[]): SyncStatus {
  let failed = 0;
  for (const e of entries) if (e.status === 'failed') failed += 1;
  return { pending: entries.length - failed, failed };
}

/** Normalise user-entered tags: trimmed, lower case, unique, in first-seen order. */
export function normalizeTags(tags: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim().toLowerCase();
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

/**
 * Field-level merge of two copies of a note: the text fields come from the
 * copy edited last (the server wins a tie), tags are the union of both.
 */
export function mergeNotes(local: Note, remote: Note): Note {
  const newer = local.updatedAt > remote.updatedAt ? local : remote;
  const older = newer === local ? remote : local;
  return {
    ...newer,
    tags: normalizeTags([...newer.tags, ...older.tags]),
    createdAt: Math.min(local.createdAt, remote.createdAt),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    version: remote.version,
  };
}

export function sameContent(a: Note, b: Note): boolean {
  return (
    a.body === b.body &&
    a.highlight === b.highlight &&
    a.tags.length === b.tags.length &&
    a.tags.every((t, i) => t === b.tags[i])
  );
}

export type ConflictResolution =
  /** Drop the local change and store the server copy. */
  | { kind: 'acceptRemote'; note: Note }
  /** Store the merged copy and push it again on top of the server version. */
  | { kind: 'repush'; note: Note; baseVersion: number }
  /** Nothing left to do on either side. */
  | { kind: 'drop' };

/**
 * Decide what to do when the server rejects a change because its copy moved on.
 * - Local delete vs remote edit: the edit wins (deleting someone's newer work is worse).
 * - Local edit vs remote delete: the edit wins and is re-created.
 * - Edit vs edit: field-level merge; re-push only if the merge differs from the server.
 */
export function resolveConflict(
  entry: OutboxEntry,
  local: Note | undefined,
  remote: Note | null,
): ConflictResolution {
  if (entry.op === 'delete') return remote ? { kind: 'acceptRemote', note: remote } : { kind: 'drop' };
  if (!local) return remote ? { kind: 'acceptRemote', note: remote } : { kind: 'drop' };
  if (!remote) return { kind: 'repush', note: { ...local, version: 0 }, baseVersion: 0 };
  const merged = mergeNotes(local, remote);
  return sameContent(merged, remote)
    ? { kind: 'acceptRemote', note: remote }
    : { kind: 'repush', note: merged, baseVersion: remote.version };
}
