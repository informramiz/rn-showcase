/** A user note (optionally a highlighted quote) on a saved story. */
export interface Note {
  id: string;
  storyId: number;
  body: string;
  highlight?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  /** Server version the note is based on; 0 means it has never been synced. */
  version: number;
}

export type NoteSyncState = 'synced' | 'pending' | 'failed';

export interface NoteWithSync extends Note {
  sync: NoteSyncState;
}

export type OutboxOp = 'upsert' | 'delete';

/** A queued local change waiting to be pushed. At most one entry per entity. */
export interface OutboxEntry {
  entityId: string;
  op: OutboxOp;
  /** Server version the change was made on top of (optimistic concurrency token). */
  baseVersion: number;
  /** Bumped on every local change so a push can tell if the entity changed while in flight. */
  revision: number;
  attempts: number;
  nextAttemptAt: number;
  /** `failed` entries are parked until the user retries them. */
  status: 'pending' | 'failed';
  lastError?: string;
  createdAt: number;
}

export interface LocalChange {
  entityId: string;
  op: OutboxOp;
  baseVersion: number;
}

/** What a push to the remote can answer. Errors are values, not exceptions. */
export type PushResult =
  | { kind: 'ok'; version: number }
  | { kind: 'conflict'; remote: Note | null }
  | { kind: 'error'; retryable: boolean; message: string };

export interface SyncChange {
  op: OutboxOp;
  entityId: string;
  baseVersion: number;
  /** Present for upserts. */
  note?: Note;
}

/** The remote end of note sync. HN has no write API, so the app ships a fake adapter. */
export interface SyncService {
  push(change: SyncChange): Promise<PushResult>;
}

export interface SyncStatus {
  pending: number;
  failed: number;
}
