import { renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { routerMock } from '../../../__tests__/routerMock';
import {
  COMMENTS_CHANNEL,
  configureNotifications,
  getAlertPermission,
  notifyNewComments,
  requestAlertPermission,
  useNotificationNavigation,
} from '../notifications';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  useLastNotificationResponse: jest.fn(),
  clearLastNotificationResponse: jest.fn(),
}));

const n = jest.mocked(Notifications);
const perm = (granted: boolean, canAskAgain = true) =>
  ({ granted, canAskAgain }) as unknown as Notifications.NotificationPermissionsStatus;
const update = { story: { id: 5, title: 'Big launch' }, newComments: 2 };

beforeEach(() => {
  jest.clearAllMocks();
  routerMock.push.mockReset();
});

describe('notifications', () => {
  it('shows alerts in the foreground', async () => {
    configureNotifications();
    const [[handler]] = n.setNotificationHandler.mock.calls as [
      [{ handleNotification: () => Promise<unknown> }],
    ];
    await expect(handler.handleNotification()).resolves.toMatchObject({ shouldShowBanner: true });
  });

  it('maps permission states', async () => {
    n.getPermissionsAsync.mockResolvedValueOnce(perm(true));
    await expect(getAlertPermission()).resolves.toBe('granted');
    n.getPermissionsAsync.mockResolvedValueOnce(perm(false));
    await expect(getAlertPermission()).resolves.toBe('undetermined');
    n.requestPermissionsAsync.mockResolvedValueOnce(perm(false, false));
    await expect(requestAlertPermission()).resolves.toBe('denied');
  });

  it('creates the Android channel before asking', async () => {
    const os = Platform.OS;
    Platform.OS = 'android';
    n.requestPermissionsAsync.mockResolvedValueOnce(perm(true));
    await requestAlertPermission();
    expect(n.setNotificationChannelAsync).toHaveBeenCalledWith(COMMENTS_CHANNEL, expect.any(Object));
    expect(n.setNotificationChannelAsync.mock.invocationCallOrder[0]).toBeLessThan(
      n.requestPermissionsAsync.mock.invocationCallOrder[0] ?? 0,
    );

    n.getPermissionsAsync.mockResolvedValueOnce(perm(true));
    await notifyNewComments(update);
    expect(n.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: { channelId: COMMENTS_CHANNEL } }),
    );
    Platform.OS = os;
  });

  it('schedules an immediate alert only with permission', async () => {
    n.getPermissionsAsync.mockResolvedValueOnce(perm(false));
    await notifyNewComments(update);
    expect(n.scheduleNotificationAsync).not.toHaveBeenCalled();

    n.getPermissionsAsync.mockResolvedValueOnce(perm(true));
    await notifyNewComments(update);
    expect(n.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: { title: '2 new comments', body: 'Big launch', data: { storyId: 5 } },
      trigger: null,
    });
  });

  it('opens the story of a tapped notification once', async () => {
    n.useLastNotificationResponse.mockReturnValue({
      notification: { request: { content: { data: { storyId: 5 } } } },
    } as unknown as Notifications.NotificationResponse);
    await renderHook(() => useNotificationNavigation());
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: '/story/[id]', params: { id: '5' } });
    expect(n.clearLastNotificationResponse).toHaveBeenCalled();

    routerMock.push.mockReset();
    n.useLastNotificationResponse.mockReturnValue(null);
    await renderHook(() => useNotificationNavigation());
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});
