import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import BookmarksScreen from '../../app/(tabs)/bookmarks';
import StoriesScreen from '../../app/(tabs)/index';
import SettingsScreen from '../../app/(tabs)/settings';
import { useBookmarks } from '../store/bookmarks';
import { useSettings } from '../store/settings';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.0' } } }));
jest.mock('@shopify/flash-list', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});

const mockFetch = jest.fn();
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

async function wrap(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return await render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  mockFetch.mockReset();
  mockPush.mockReset();
  globalThis.fetch = mockFetch as unknown as typeof fetch;
  useBookmarks.setState({ items: [] });
});

describe('StoriesScreen', () => {
  it('shows a skeleton, then stories, and navigates on press', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('topstories')) return ok([11, 12]);
      const id = Number(/item\/(\d+)/.exec(url)?.[1]);
      return ok({ id, title: `Story ${id}`, by: 'pg', score: 5, time: 1, type: 'story' });
    });
    await wrap(<StoriesScreen />);
    expect(screen.getByTestId('story-skeleton')).toBeTruthy();
    expect(await screen.findByText('Story 11')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('story-item-0'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/story/[id]', params: { id: '11' } });
  });

  it('shows an error state and recovers on retry', async () => {
    mockFetch.mockRejectedValue(new TypeError('down'));
    await wrap(<StoriesScreen />);
    expect(await screen.findByTestId('error-state')).toBeTruthy();
    mockFetch.mockImplementation(async (url: string) => {
      if (url.includes('topstories')) return ok([1]);
      return ok({ id: 1, title: 'Back online', type: 'story' });
    });
    await fireEvent.press(screen.getByTestId('retry-button'));
    await waitFor(() => expect(screen.getByText('Back online')).toBeTruthy());
  });
});

describe('BookmarksScreen', () => {
  it('shows empty state, then saved stories', async () => {
    const { rerender } = await wrap(<BookmarksScreen />);
    expect(screen.getByText('No bookmarks yet')).toBeTruthy();
    useBookmarks.setState({ items: [{ id: 7, title: 'Saved one' }] });
    await rerender(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })}>
        <BookmarksScreen />
      </QueryClientProvider>,
    );
    expect(screen.getByText('Saved one')).toBeTruthy();
  });
});

describe('SettingsScreen', () => {
  it('changes the theme override', async () => {
    useSettings.setState({ themeMode: 'system' });
    await wrap(<SettingsScreen />);
    await fireEvent.press(screen.getByTestId('theme-dark'));
    expect(useSettings.getState().themeMode).toBe('dark');
  });
});
