import * as WebBrowser from 'expo-web-browser';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBookmarks } from '@/features/bookmarks/store';
import { useHistory } from '@/features/history/store';
import { useStoryDetailViewModel } from '@/features/story-detail/useStoryDetailViewModel';
import { clientWrapper, httpError, installFetch, mockFetch, ok } from '../../../__tests__/helpers';
import { routerMock } from '../../../__tests__/routerMock';

const story = { id: 5, type: 'story', title: 'T', url: 'https://x.dev/a', text: '<p>Hi &amp; bye</p>' };

beforeEach(() => {
  installFetch();
  routerMock.params = { id: '5' };
  useBookmarks.setState({ items: [] });
  useHistory.setState({ entries: [] });
});

const setup = () => renderHook(() => useStoryDetailViewModel(), { wrapper: clientWrapper() });

describe('useStoryDetailViewModel', () => {
  it('loads the story, derives host and body text, and records history', async () => {
    mockFetch.mockReturnValue(ok(story));
    const { result } = await setup();
    expect(result.current.state.isPending).toBe(true);
    await waitFor(() => {
      expect(result.current.state.story?.id).toBe(5);
    });
    expect(result.current.state.host).toBe('x.dev');
    expect(result.current.state.bodyText).toContain('Hi & bye');
    expect(useHistory.getState().entries.map((e) => e.story.id)).toEqual([5]);
  });

  it('toggles the bookmark', async () => {
    mockFetch.mockReturnValue(ok(story));
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.story).toBeDefined();
    });
    await act(() => {
      result.current.actions.toggleBookmark();
    });
    expect(result.current.state.bookmarked).toBe(true);
    await act(() => {
      result.current.actions.toggleBookmark();
    });
    expect(result.current.state.bookmarked).toBe(false);
  });

  it('opens the link in the in-app browser', async () => {
    mockFetch.mockReturnValue(ok(story));
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.story).toBeDefined();
    });
    await act(() => {
      result.current.actions.openLink();
    });
    expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith('https://x.dev/a');
  });

  it('refuses to open non-http(s) links', async () => {
    jest.mocked(WebBrowser.openBrowserAsync).mockClear();
    mockFetch.mockReturnValue(ok({ ...story, url: 'javascript:alert(1)' }));
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.story).toBeDefined();
    });
    expect(result.current.state.canOpenLink).toBe(false);
    await act(() => {
      result.current.actions.openLink();
    });
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it('allows https links', async () => {
    mockFetch.mockReturnValue(ok(story));
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.canOpenLink).toBe(true);
    });
  });

  it('exposes errors and retries', async () => {
    mockFetch.mockReturnValue(httpError(500));
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.error).not.toBeNull();
    });
    expect(result.current.state.story).toBeUndefined();
    mockFetch.mockReturnValue(ok(story));
    await act(() => {
      result.current.actions.retry();
    });
    await waitFor(() => {
      expect(result.current.state.story?.id).toBe(5);
    });
  });

  it('does nothing for toggle/openLink before the story loads', async () => {
    mockFetch.mockReturnValue(new Promise(() => undefined));
    const { result } = await setup();
    await act(() => {
      result.current.actions.toggleBookmark();
      result.current.actions.openLink();
    });
    expect(useBookmarks.getState().items).toEqual([]);
  });
});
