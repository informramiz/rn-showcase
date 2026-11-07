import { Alert, Platform } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import BookmarksScreen from '../../app/(tabs)/bookmarks';
import StoriesScreen from '../../app/(tabs)/index';
import SettingsScreen from '../../app/(tabs)/settings';
import { useBookmarks } from '../store/bookmarks';
import { useSettings } from '../store/settings';
import { installFetch, itemIdFromUrl, mockFetch, ok, renderWithClient } from './helpers';
import { routerMock } from './routerMock';

beforeEach(() => {
  installFetch();
  routerMock.push.mockReset();
  useBookmarks.setState({ items: [] });
});

describe('StoriesScreen', () => {
  it('shows a skeleton, then stories, and navigates on press', async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes('topstories')) return ok([11, 12]);
      const id = itemIdFromUrl(url);
      return ok({ id, title: `Story ${id}`, by: 'pg', score: 5, time: 1, type: 'story' });
    });
    await renderWithClient(<StoriesScreen />);
    expect(screen.getByTestId('story-skeleton')).toBeTruthy();
    expect(await screen.findByText('Story 11')).toBeTruthy();
    await fireEvent.press(screen.getByText('Story 11'));
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: '/story/[id]', params: { id: '11' } });
  });

  it('shows an error state and recovers on retry', async () => {
    mockFetch.mockRejectedValue(new TypeError('down'));
    await renderWithClient(<StoriesScreen />);
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
    await renderWithClient(<BookmarksScreen />);
    expect(screen.getByText('No bookmarks yet')).toBeTruthy();
    await screen.unmount();
    useBookmarks.setState({ items: [{ id: 7, title: 'Saved one' }] });
    await renderWithClient(<BookmarksScreen />);
    expect(screen.getByText('Saved one')).toBeTruthy();
  });
});

describe('SettingsScreen', () => {
  it('changes the theme override', async () => {
    useSettings.setState({ themeMode: 'system' });
    await renderWithClient(<SettingsScreen />);
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
      useBookmarks.setState({ items: [{ id: 1, title: 'Keep me' }] });
      await renderWithClient(<SettingsScreen />);
      await press();
      expect(useBookmarks.getState().items).toHaveLength(1);
      const buttons = alert.mock.calls[0]?.[2];
      await act(() => {
        buttons?.find((b) => b.text === 'Cancel')?.onPress?.();
      });
      expect(useBookmarks.getState().items).toHaveLength(1);
      await act(() => {
        buttons?.find((b) => b.text === 'Remove')?.onPress?.();
      });
      expect(useBookmarks.getState().items).toHaveLength(0);
    });

    it('uses window.confirm on web', async () => {
      Platform.OS = 'web';
      const confirm = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
      Object.assign(globalThis, { window: { confirm } });
      useBookmarks.setState({ items: [{ id: 1, title: 'Keep me' }] });
      await renderWithClient(<SettingsScreen />);
      await press();
      expect(useBookmarks.getState().items).toHaveLength(1);
      await press();
      expect(confirm).toHaveBeenCalledTimes(2);
      expect(useBookmarks.getState().items).toHaveLength(0);
    });
  });
});
