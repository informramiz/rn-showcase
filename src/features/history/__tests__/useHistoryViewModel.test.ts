import { act, renderHook } from '@testing-library/react-native';
import { useHistory } from '@/features/history/store';
import { useHistoryViewModel } from '@/features/history/useHistoryViewModel';
import { routerMock } from '../../../__tests__/routerMock';

const a = { id: 1, title: 'A' };
const b = { id: 2, title: 'B' };

beforeEach(() => {
  routerMock.push.mockReset();
  useHistory.setState({ entries: [] });
});

describe('useHistoryViewModel', () => {
  it('lists read stories, newest first, all marked read', async () => {
    useHistory.getState().markRead(a, 1);
    useHistory.getState().markRead(b, 2);
    const { result } = await renderHook(() => useHistoryViewModel());
    expect(result.current.state.stories).toEqual([b, a]);
    expect(result.current.state.readIds.has(1)).toBe(true);
  });

  it('updates when a story is opened', async () => {
    const { result } = await renderHook(() => useHistoryViewModel());
    expect(result.current.state.stories).toEqual([]);
    await act(() => {
      result.current.actions.openStory(a);
    });
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: '/story/[id]', params: { id: '1' } });
    expect(result.current.state.stories).toEqual([a]);
  });
});
