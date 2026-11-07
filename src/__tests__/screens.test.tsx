import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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
});
