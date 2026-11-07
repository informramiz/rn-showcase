import { act, renderHook } from '@testing-library/react-native';
import { useBookmarks } from '@/features/bookmarks/store';
import { useBookmarksViewModel } from '@/features/bookmarks/useBookmarksViewModel';
import { useHistory } from '@/features/history/store';
import { routerMock } from '../../../__tests__/routerMock';

const a = { id: 1, title: 'A' };
const b = { id: 2, title: 'B' };

beforeEach(() => {
  routerMock.push.mockReset();
  useBookmarks.setState({ items: [a, b] });
  useHistory.setState({ entries: [] });
});

describe('useBookmarksViewModel', () => {
  it('exposes saved stories and which of them are read', async () => {
    useHistory.getState().markRead(b);
    const { result } = await renderHook(() => useBookmarksViewModel());
    expect(result.current.state.stories).toEqual([a, b]);
    expect([...result.current.state.readIds]).toEqual([2]);
  });

  it('follows the store', async () => {
    const { result } = await renderHook(() => useBookmarksViewModel());
    await act(() => {
      useBookmarks.getState().toggle(a);
    });
    expect(result.current.state.stories).toEqual([b]);
  });

  it('opens a story and records it in history', async () => {
    const { result } = await renderHook(() => useBookmarksViewModel());
    await act(() => {
      result.current.actions.openStory(a);
    });
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: '/story/[id]', params: { id: '1' } });
    expect(useHistory.getState().entries.map((e) => e.story.id)).toEqual([1]);
  });
});
