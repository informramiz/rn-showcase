/** Web: no local notifications in this demo; everything is a no-op. */
export type AlertPermission = 'granted' | 'denied' | 'undetermined';

export const COMMENTS_CHANNEL = 'comments';

export function configureNotifications(): void {
  // No-op on web.
}

export function getAlertPermission(): Promise<AlertPermission> {
  return Promise.resolve('denied');
}

export function requestAlertPermission(): Promise<AlertPermission> {
  return Promise.resolve('denied');
}

export function notifyNewComments(): Promise<void> {
  return Promise.resolve();
}

export function useNotificationNavigation(): void {
  // No-op on web.
}
