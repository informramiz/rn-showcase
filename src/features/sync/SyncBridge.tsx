import { useSyncEvents } from './useSyncStatus';

/** Renders nothing; keeps query caches in step with background sync runs. */
export function SyncBridge(): null {
  useSyncEvents();
  return null;
}
