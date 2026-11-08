import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useStoriesViewModel } from '@/features/stories/useStoriesViewModel';
import { clientWrapper, installFetch, itemIdFromUrl, mockFetch, ok } from '../../../__tests__/helpers';
import { routerMock } from '../../../__tests__/routerMock';

const ids = Array.from({ length: 40 }, (_, i) => i + 1);

beforeEach(() => {
  installFetch();
  routerMock.push.mockReset();
  mockFetch.mockImplementation((url) => {
    if (url.includes('topstories')) return ok(ids);
    if (url.includes('newstories')) return ok([100]);
    const id = itemIdFromUrl(url);
    return ok({ id, title: `Story ${id}`, type: 'story' });
  });
});

const setup = () => renderHook(() => useStoriesViewModel(), { wrapper: clientWrapper() });

describe('useStoriesViewModel', () => {
  it('starts pending on the top feed, then exposes story summaries', async () => {
    const { result } = await setup();
    expect(result.current.state.feed).toBe('top');
    expect(result.current.state.isPending).toBe(true);
    await waitFor(() => {
      expect(result.current.state.isPending).toBe(false);
    });
    expect(result.current.state.stories[0]).toMatchObject({ id: 1, title: 'Story 1' });
    expect(result.current.state.showError).toBe(false);
  });

  it('switches feed', async () => {
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.isPending).toBe(false);
    });
    await act(() => {
      result.current.actions.selectFeed('new');
    });
    await waitFor(() => {
      expect(result.current.state.stories.map((s) => s.id)).toEqual([100]);
    });
    expect(result.current.state.feed).toBe('new');
  });

  it('loads the next page and refreshes', async () => {
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.stories.length).toBeGreaterThan(0);
    });
    const first = result.current.state.stories.length;
    await act(() => {
      result.current.actions.loadMore();
    });
    await waitFor(() => {
      expect(result.current.state.stories.length).toBeGreaterThan(first);
    });
    await act(async () => {
      result.current.actions.refresh();
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.state.refreshing).toBe(false);
    });
    expect(result.current.state.stories).toHaveLength(first);
  });

  it('reports an error when nothing is cached, and retries', async () => {
    mockFetch.mockRejectedValue(new TypeError('down'));
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.showError).toBe(true);
    });
    mockFetch.mockReturnValue(ok([]));
    await act(() => {
      result.current.actions.retry();
    });
    await waitFor(() => {
      expect(result.current.state.showError).toBe(false);
    });
  });

  it('opens a story and marks it read', async () => {
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.stories.length).toBeGreaterThan(0);
    });
    const story = result.current.state.stories[0];
    if (!story) throw new Error('no story');
    await act(() => {
      result.current.actions.openStory(story);
    });
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: '/story/[id]', params: { id: '1' } });
    await waitFor(() => {
      expect(result.current.state.readIds.has(1)).toBe(true);
    });
  });
});
