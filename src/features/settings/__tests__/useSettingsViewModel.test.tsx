import { Alert, Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBookmarks } from '@/features/bookmarks/store';
import { useHistory } from '@/features/history/store';
import { useSettings } from '@/features/settings/store';
import { useSettingsViewModel } from '@/features/settings/useSettingsViewModel';
import { clientWrapper, newTestClient } from '../../../__tests__/helpers';

const story = { id: 1, title: 'A' };

beforeEach(() => {
  useSettings.setState({ themeMode: 'system' });
  useBookmarks.setState({ items: [story] });
  useHistory.setState({ entries: [{ story, readAt: 1 }] });
});
afterEach(() => {
  jest.restoreAllMocks();
});

describe('useSettingsViewModel', () => {
  it('exposes and changes the theme mode', async () => {
    const { result } = await renderHook(() => useSettingsViewModel(), { wrapper: clientWrapper() });
    expect(result.current.state.themeMode).toBe('system');
    expect(result.current.state.themeModes).toEqual(['system', 'light', 'dark']);
    await act(() => {
      result.current.actions.setThemeMode('dark');
    });
    expect(result.current.state.themeMode).toBe('dark');
  });

  it('clears the query cache and history but keeps bookmarks', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const client = newTestClient();
    client.setQueryData(['item', 1], { id: 1 });
    const { result } = await renderHook(() => useSettingsViewModel(), { wrapper: clientWrapper(client) });
    await act(async () => {
      await result.current.actions.clearCache();
    });
    expect(client.getQueryData(['item', 1])).toBeUndefined();
    expect(useHistory.getState().entries).toEqual([]);
    expect(useBookmarks.getState().items).toHaveLength(1);
    expect(alert).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem('rn-showcase-query-cache')).toBeNull();
  });

  it('confirms before removing bookmarks on native', async () => {
    Platform.OS = 'ios';
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { result } = await renderHook(() => useSettingsViewModel(), { wrapper: clientWrapper() });
    await act(() => {
      result.current.actions.confirmClearBookmarks();
    });
    expect(useBookmarks.getState().items).toHaveLength(1);
    await act(() => {
      alert.mock.calls[0]?.[2]?.find((b) => b.text === 'Remove')?.onPress?.();
    });
    expect(useBookmarks.getState().items).toEqual([]);
  });
});
