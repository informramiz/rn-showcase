import { Alert, Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useSettings } from '@/features/settings/store';
import { useSettingsViewModel } from '@/features/settings/useSettingsViewModel';
import type { AppServices } from '@/shared/services/AppServices';
import { clientWrapper, newTestClient, newTestServices } from '../../../__tests__/helpers';

const saved = { id: 1, title: 'Saved' };
const read = { id: 2, title: 'Read' };
const cachedOnly = { id: 3, type: 'story' as const, title: 'Cached' };
let services: AppServices;

beforeEach(async () => {
  useSettings.setState({ themeMode: 'system' });
  services = newTestServices();
  await services.repos.bookmarks.toggle(saved, 1);
  await services.repos.history.markRead(read, 2);
  await services.repos.cache.putItems([cachedOnly], 3);
});
afterEach(() => {
  jest.restoreAllMocks();
});

const setup = (client = newTestClient()) =>
  renderHook(() => useSettingsViewModel(), { wrapper: clientWrapper(client, services) });

describe('useSettingsViewModel', () => {
  it('exposes and changes the theme mode', async () => {
    const { result } = await setup();
    expect(result.current.state.themeMode).toBe('system');
    expect(result.current.state.themeModes).toEqual(['system', 'light', 'dark']);
    await act(() => {
      result.current.actions.setThemeMode('dark');
    });
    expect(result.current.state.themeMode).toBe('dark');
  });

  it('clears cached stories, server state and history but keeps bookmarks', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const client = newTestClient();
    client.setQueryData(['item', 1], { id: 1 });
    const { result } = await setup(client);
    await act(async () => {
      await result.current.actions.clearCache();
    });
    expect(client.getQueryData(['item', 1])).toBeUndefined();
    expect(await services.repos.history.list()).toEqual([]);
    expect(await services.repos.cache.getItem(3)).toBeUndefined();
    expect((await services.repos.bookmarks.list()).map((b) => b.story.id)).toEqual([1]);
    expect(alert).toHaveBeenCalledTimes(1);
  });

  it('confirms before removing bookmarks on native', async () => {
    Platform.OS = 'ios';
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { result } = await setup();
    await act(() => {
      result.current.actions.confirmClearBookmarks();
    });
    expect(await services.repos.bookmarks.list()).toHaveLength(1);
    await act(async () => {
      alert.mock.calls[0]?.[2]?.find((b) => b.text === 'Remove')?.onPress?.();
      await Promise.resolve();
    });
    expect(await services.repos.bookmarks.list()).toEqual([]);
  });
});
