import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import SearchScreen from '../../../../app/(tabs)/search';
import { useSearchViewModel } from '@/features/search/useSearchViewModel';
import type { AppServices } from '@/shared/services/AppServices';
import { clientWrapper, newTestClient, newTestServices, renderWithClient } from '../../../__tests__/helpers';
import { routerMock } from '../../../__tests__/routerMock';

let services: AppServices;

beforeEach(async () => {
  routerMock.push.mockReset();
  services = newTestServices();
  await services.repos.cache.putItems(
    [
      { id: 1, type: 'story', title: 'Rust compiler internals' },
      { id: 2, type: 'story', title: 'Ask HN: favourite editor', text: 'I use a rust plugin' },
      { id: 3, type: 'story', title: 'Gardening' },
    ],
    1,
  );
  await services.repos.bookmarks.toggle({ id: 2, title: 'Ask HN: favourite editor' }, 2);
});

describe('useSearchViewModel', () => {
  const setup = () =>
    renderHook(() => useSearchViewModel(), { wrapper: clientWrapper(newTestClient(), services) });

  it('finds nothing without a query', async () => {
    const { result } = await setup();
    expect(result.current.state.hasQuery).toBe(false);
    expect(result.current.state.results).toEqual([]);
  });

  it('searches all cached stories, then only saved ones', async () => {
    const { result } = await setup();
    await act(() => {
      result.current.actions.setQuery('rust');
    });
    await waitFor(() => {
      expect(result.current.state.results.map((s) => s.id)).toEqual([1, 2]);
    });
    await act(() => {
      result.current.actions.setScope('saved');
    });
    await waitFor(() => {
      expect(result.current.state.results.map((s) => s.id)).toEqual([2]);
    });
  });
});

describe('SearchScreen', () => {
  it('shows the prompt, results, empty state and opens a result', async () => {
    await renderWithClient(<SearchScreen />, newTestClient(), services);
    expect(screen.getByText('Search offline')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('search-input'), 'compiler');
    await fireEvent.press(await screen.findByText('Rust compiler internals'));
    expect(routerMock.push).toHaveBeenCalledWith({ pathname: '/story/[id]', params: { id: '1' } });
    await fireEvent.press(screen.getByTestId('search-scope-saved'));
    expect(await screen.findByText('No matching stories')).toBeTruthy();
  });
});
