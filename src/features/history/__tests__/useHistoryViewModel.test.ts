import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useHistoryViewModel } from '@/features/history/useHistoryViewModel';
import type { AppServices } from '@/shared/services/AppServices';
import { clientWrapper, newTestClient, newTestServices } from '../../../__tests__/helpers';
import { routerMock } from '../../../__tests__/routerMock';

const a = { id: 1, title: 'A' };
const b = { id: 2, title: 'B' };
let services: AppServices;

beforeEach(() => {
  routerMock.push.mockReset();
  services = newTestServices();
});

const setup = () =>
  renderHook(() => useHistoryViewModel(), { wrapper: clientWrapper(newTestClient(), services) });

describe('useHistoryViewModel', () => {
  it('lists read stories, newest first, all marked read', async () => {
    await services.repos.history.markRead(a, 1);
    await services.repos.history.markRead(b, 2);
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.stories.map((s) => s.id)).toEqual([2, 1]);
    });
    expect(result.current.state.readIds.has(1)).toBe(true);
  });

  it('updates when a story is opened', async () => {
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.stories).toEqual([]);
    });
    await act(() => {
      result.current.actions.openStory(a);
    });
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: '/story/[id]', params: { id: '1' } });
    await waitFor(() => {
      expect(result.current.state.stories.map((s) => s.id)).toEqual([1]);
    });
  });
});
