import type { ReactElement } from 'react';
import { Alert, Platform } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import BookmarksScreen from '../../app/(tabs)/bookmarks';
import StoriesScreen from '../../app/(tabs)';
import HistoryScreen from '../../app/(tabs)/history';
import SettingsScreen from '../../app/(tabs)/settings';
import { useSettings } from '@/features/settings/store';
import type { AppServices } from '@/shared/services/AppServices';
import {
  installFetch,
  itemIdFromUrl,
  mockFetch,
  newTestClient,
  newTestServices,
  ok,
  renderWithClient,
} from './helpers';
import { routerMock } from './routerMock';

let services: AppServices;
const renderScreen = (ui: ReactElement) => renderWithClient(ui, newTestClient(), services);
const bookmarkCount = async () => (await services.repos.bookmarks.list()).length;

beforeEach(() => {
  installFetch();
  routerMock.push.mockReset();
  services = newTestServices();
});

describe('StoriesScreen', () => {
  it('shows a skeleton, then stories, and navigates on press', async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes('topstories')) return ok([11, 12]);
      const id = itemIdFromUrl(url);
      return ok({ id, title: `Story ${id}`, by: 'pg', score: 5, time: 1, type: 'story' });
    });
    await renderScreen(<StoriesScreen />);
    expect(screen.getByTestId('story-skeleton')).toBeTruthy();
    expect(await screen.findByText('Story 11')).toBeTruthy();
    await fireEvent.press(screen.getByText('Story 11'));
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: '/story/[id]', params: { id: '11' } });
  });

  it('shows an error state and recovers on retry', async () => {
    mockFetch.mockRejectedValue(new TypeError('down'));
    await renderScreen(<StoriesScreen />);
    expect(await screen.findByText('Could not load')).toBeTruthy();
    mockFetch.mockImplementation((url) => {
      if (url.includes('topstories')) return ok([1]);
      return ok({ id: 1, title: 'Back online', type: 'story' });
    });
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      expect(screen.getByText('Back online')).toBeTruthy();
    });
  });
});

describe('BookmarksScreen', () => {
  it('shows empty state, then saved stories', async () => {
    await renderScreen(<BookmarksScreen />);
    expect(await screen.findByText('No bookmarks yet')).toBeTruthy();
    await screen.unmount();
    await services.repos.bookmarks.toggle({ id: 7, title: 'Saved one' }, 1);
    await renderScreen(<BookmarksScreen />);
    expect(await screen.findByText('Saved one')).toBeTruthy();
  });
});

describe('HistoryScreen', () => {
  it('shows empty state, then read stories', async () => {
    await renderScreen(<HistoryScreen />);
    expect(await screen.findByText('Nothing read yet')).toBeTruthy();
    await screen.unmount();
    await services.repos.history.markRead({ id: 3, title: 'Read one' }, 1);
    await renderScreen(<HistoryScreen />);
    expect(await screen.findByText('Read one')).toBeTruthy();
  });
});

describe('SettingsScreen', () => {
  it('changes the theme override', async () => {
    useSettings.setState({ themeMode: 'system' });
    await renderScreen(<SettingsScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Dark' }));
    expect(useSettings.getState().themeMode).toBe('dark');
  });

  describe('remove all bookmarks', () => {
    const press = () => fireEvent.press(screen.getByRole('button', { name: 'Remove all bookmarks' }));
    const originalOS = Platform.OS;
    afterEach(() => {
      Platform.OS = originalOS;
      jest.restoreAllMocks();
    });

    it('asks first on native and only removes after confirming', async () => {
      const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
      await services.repos.bookmarks.toggle({ id: 1, title: 'Keep me' }, 1);
      await renderScreen(<SettingsScreen />);
      await press();
      expect(await bookmarkCount()).toBe(1);
      const buttons = alert.mock.calls[0]?.[2];
      await act(() => {
        buttons?.find((b) => b.text === 'Cancel')?.onPress?.();
      });
      expect(await bookmarkCount()).toBe(1);
      await act(() => {
        buttons?.find((b) => b.text === 'Remove')?.onPress?.();
      });
      await waitFor(async () => {
        expect(await bookmarkCount()).toBe(0);
      });
    });

    it('uses window.confirm on web', async () => {
      Platform.OS = 'web';
      const confirm = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
      Object.assign(globalThis, { window: { confirm } });
      await services.repos.bookmarks.toggle({ id: 1, title: 'Keep me' }, 1);
      await renderScreen(<SettingsScreen />);
      await press();
      expect(await bookmarkCount()).toBe(1);
      await press();
      expect(confirm).toHaveBeenCalledTimes(2);
      await waitFor(async () => {
        expect(await bookmarkCount()).toBe(0);
      });
    });
  });
});
