import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBookmarksViewModel } from '@/features/bookmarks/useBookmarksViewModel';
import type { AppServices } from '@/shared/services/AppServices';
import { clientWrapper, newTestClient, newTestServices } from '../../../__tests__/helpers';
import { routerMock } from '../../../__tests__/routerMock';

const a = { id: 1, title: 'A' };
const b = { id: 2, title: 'B' };
let services: AppServices;

beforeEach(async () => {
  routerMock.push.mockReset();
  services = newTestServices();
  // Save b first so a (newer) is listed first.
  await services.repos.bookmarks.toggle(b, 1);
  await services.repos.bookmarks.toggle(a, 2);
});

const setup = () =>
  renderHook(() => useBookmarksViewModel(), { wrapper: clientWrapper(newTestClient(), services) });

describe('useBookmarksViewModel', () => {
  it('exposes saved stories, newest first, and which of them are read', async () => {
    await services.repos.history.markRead(b, 3);
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.stories.map((s) => s.id)).toEqual([1, 2]);
    });
    await waitFor(() => {
      expect([...result.current.state.readIds]).toEqual([2]);
    });
  });

  it('removes a bookmark', async () => {
    const { result } = await setup();
    await waitFor(() => {
      expect(result.current.state.stories).toHaveLength(2);
    });
    await act(() => {
      result.current.actions.remove(1);
    });
    await waitFor(() => {
      expect(result.current.state.stories.map((s) => s.id)).toEqual([2]);
    });
  });

  it('opens a story and records it in history', async () => {
    const { result } = await setup();
    await act(() => {
      result.current.actions.openStory(a);
    });
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: '/story/[id]', params: { id: '1' } });
    await waitFor(() => {
      expect(result.current.state.readIds.has(1)).toBe(true);
    });
  });
});
