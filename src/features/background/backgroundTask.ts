import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { notifyNewComments } from '@/shared/notifications/notifications';
import type { AppServices } from '@/shared/services/AppServices';
import { createAppServices } from '@/shared/services/createAppServices';
import { refreshInBackground } from './refresh';

export const REFRESH_TASK = 'hn-background-refresh';
/** Minutes; the OS treats it as a lower bound (15 is the minimum Expo allows). */
export const REFRESH_INTERVAL_MINUTES = 15;

/** The task body, separate from defineTask so it can be tested with fake services. */
export async function runRefreshTask(
  openServices: () => Promise<AppServices> = createAppServices,
): Promise<BackgroundTask.BackgroundTaskResult> {
  try {
    await refreshInBackground(await openServices(), notifyNewComments);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (e) {
    console.warn('Background refresh failed', e);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
}

// Must run at module scope so the task exists when the OS starts the app headless.
TaskManager.defineTask(REFRESH_TASK, () => runRefreshTask());

/** Register the periodic refresh once. Returns false where background tasks are unavailable. */
export async function registerBackgroundRefresh(): Promise<boolean> {
  if ((await BackgroundTask.getStatusAsync()) !== BackgroundTask.BackgroundTaskStatus.Available) return false;
  if (!(await TaskManager.isTaskRegisteredAsync(REFRESH_TASK))) {
    await BackgroundTask.registerTaskAsync(REFRESH_TASK, { minimumInterval: REFRESH_INTERVAL_MINUTES });
  }
  return true;
}
