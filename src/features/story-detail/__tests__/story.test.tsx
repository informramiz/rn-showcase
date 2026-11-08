import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import StoryDetailScreen from '../../../../app/story/[id]';
import type { AppServices } from '@/shared/services/AppServices';
import {
  httpError,
  installFetch,
  mockFetch,
  newTestClient,
  newTestServices,
  ok,
  renderWithClient,
} from '../../../__tests__/helpers';
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

let services: AppServices;
const renderScreen = () => renderWithClient(<StoryDetailScreen />, newTestClient(), services);
const bookmarkIds = async () => (await services.repos.bookmarks.list()).map((b) => b.story.id);

beforeEach(() => {
  installFetch();
  routerMock.params = { id: '5' };
  services = newTestServices();
});

describe('StoryDetailScreen', () => {
  it('rejects a deep link that does not carry a story id without fetching', async () => {
    routerMock.params = { id: 'not-a-number' };
    await renderScreen();
    expect(screen.getByText('That link does not point to a story.')).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows a placeholder while loading, then the story, and records it in history', async () => {
    let resolve: (v: unknown) => void = () => undefined;
    mockFetch.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    await renderScreen();
    expect(screen.queryByTestId('story-detail')).toBeNull();
    expect(screen.queryByText('Could not load')).toBeNull();

    await act(async () => {
      resolve(await ok(story));
    });
    expect(await screen.findByText('A fine story')).toBeTruthy();
    expect(screen.getByText('No comments yet.')).toBeTruthy();
    await waitFor(async () => {
      expect((await services.repos.history.list()).map((e) => e.story.id)).toEqual([5]);
    });
  });

  it('shows an error and recovers on retry', async () => {
    mockFetch.mockReturnValue(httpError(500));
    await renderScreen();
    expect(await screen.findByText('The server returned an error (500).')).toBeTruthy();

    mockFetch.mockReturnValue(ok(story));
    await fireEvent.press(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('A fine story')).toBeTruthy();
  });

  it('toggles the bookmark', async () => {
    mockFetch.mockReturnValue(ok(story));
    await renderScreen();
    await fireEvent.press(await screen.findByRole('button', { name: 'Save' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Saved' }));
    expect(await screen.findByRole('button', { name: 'Save' })).toBeTruthy();
    expect(await bookmarkIds()).toEqual([]);
  });

  it('saves a bookmark to the local store', async () => {
    mockFetch.mockReturnValue(ok(story));
    await renderScreen();
    await fireEvent.press(await screen.findByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: 'Saved' })).toBeTruthy();
    expect(await bookmarkIds()).toEqual([5]);
  });

  it('opens the link in the browser', async () => {
    const WebBrowser = jest.requireMock<{ openBrowserAsync: jest.Mock }>('expo-web-browser');
    mockFetch.mockReturnValue(ok(story));
    await renderScreen();
    await fireEvent.press(await screen.findByRole('button', { name: 'Open link' }));
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://x.dev/a');
  });
});
