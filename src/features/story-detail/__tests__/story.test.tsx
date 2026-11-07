import { act, fireEvent, screen } from '@testing-library/react-native';
import StoryDetailScreen from '../../../../app/story/[id]';
import { useBookmarks } from '@/features/bookmarks/store';
import { useHistory } from '@/features/history/store';
import { httpError, installFetch, mockFetch, ok, renderWithClient } from '../../../__tests__/helpers';
import { routerMock } from '../../../__tests__/routerMock';

const story = {
  id: 5,
  type: 'story',
  title: 'A fine story',
  by: 'pg',
  score: 10,
  time: 1,
  url: 'https://x.dev/a',
};

beforeEach(() => {
  installFetch();
  routerMock.params = { id: '5' };
  useBookmarks.setState({ items: [] });
  useHistory.setState({ entries: [] });
});

describe('StoryDetailScreen', () => {
  it('shows a placeholder while loading, then the story, and records it in history', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    mockFetch.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    await renderWithClient(<StoryDetailScreen />);
    expect(screen.queryByTestId('story-detail')).toBeNull();
    expect(screen.queryByText('Could not load')).toBeNull();

    await act(async () => {
      resolve(await ok(story));
    });
    expect(await screen.findByText('A fine story')).toBeTruthy();
    expect(screen.getByText('No comments yet.')).toBeTruthy();
    expect(useHistory.getState().entries.map((e) => e.story.id)).toEqual([5]);
  });

  it('shows an error and recovers on retry', async () => {
    mockFetch.mockReturnValue(httpError(500));
    await renderWithClient(<StoryDetailScreen />);
    expect(await screen.findByText('The server returned an error (500).')).toBeTruthy();

    mockFetch.mockReturnValue(ok(story));
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('A fine story')).toBeTruthy();
  });

  it('toggles the bookmark', async () => {
    mockFetch.mockReturnValue(ok(story));
    await renderWithClient(<StoryDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Save' }));
    expect(useBookmarks.getState().items.map((i) => i.id)).toEqual([5]);
    await fireEvent.press(screen.getByRole('button', { name: 'Saved' }));
    expect(useBookmarks.getState().items).toEqual([]);
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
  });

  it('opens the link in the browser', async () => {
    const WebBrowser = jest.requireMock<{ openBrowserAsync: jest.Mock }>('expo-web-browser');
    mockFetch.mockReturnValue(ok(story));
    await renderWithClient(<StoryDetailScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Open link' }));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://x.dev/a');
  });
});
