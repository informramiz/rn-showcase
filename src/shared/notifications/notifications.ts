import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { strings } from '@/shared/i18n/strings';

export type AlertPermission = 'granted' | 'denied' | 'undetermined';

export const COMMENTS_CHANNEL = 'comments';

/** Show alerts while the app is open too. Call once at module scope of the root layout. */
export function configureNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: () =>
      Promise.resolve({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
  });
}

/** Android 13+ only shows the permission prompt once a channel exists. */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(COMMENTS_CHANNEL, {
    name: strings.alerts.channelName,
    importance: AndroidImportance.DEFAULT,
  });
}

function toPermission(p: Notifications.NotificationPermissionsStatus): AlertPermission {
  if (p.granted) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function getAlertPermission(): Promise<AlertPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

export async function requestAlertPermission(): Promise<AlertPermission> {
  await ensureChannel();
  return toPermission(await Notifications.requestPermissionsAsync());
}

/** Local notification for new comments on a saved story; silently skipped without permission. */
export async function notifyNewComments(update: {
  story: { id: number; title: string };
  newComments: number;
}) {
  if ((await getAlertPermission()) !== 'granted') return;
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: strings.alerts.title(update.newComments),
      body: update.story.title,
      data: { storyId: update.story.id },
    },
    trigger: Platform.OS === 'android' ? { channelId: COMMENTS_CHANNEL } : null,
  });
}

/** Open the story a tapped notification points at (also when the tap launched the app). */
export function useNotificationNavigation(): void {
  const response = Notifications.useLastNotificationResponse();
  const router = useRouter();
  useEffect(() => {
    const storyId: unknown = response?.notification.request.content.data?.storyId;
    if (typeof storyId !== 'number') return;
    router.push({ pathname: '/story/[id]', params: { id: String(storyId) } });
    Notifications.clearLastNotificationResponse();
  }, [response, router]);
}
