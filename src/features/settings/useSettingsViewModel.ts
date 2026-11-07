import { useQueryClient } from '@tanstack/react-query';
import { Alert, Platform } from 'react-native';
import { useBookmarks } from '@/features/bookmarks/store';
import { useHistory } from '@/features/history/store';
import { strings } from '@/shared/i18n/strings';
import { clearQueryCache } from '@/shared/query/queryClient';
import { useSettings, type ThemeMode } from './store';

const MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export function useSettingsViewModel() {
  const client = useQueryClient();
  const mode = useSettings((s) => s.themeMode);
  const setThemeMode = useSettings((s) => s.setThemeMode);
  const clearHistory = useHistory((s) => s.clear);
  const clearBookmarks = useBookmarks((s) => s.clear);

  const confirmClearBookmarks = () => {
    const { removeBookmarksTitle: title, removeBookmarksBody: body, cancel, remove } = strings.settings;
    if (Platform.OS === 'web') {
      // Alert.alert buttons do not run on react-native-web.
      if (window.confirm(`${title}\n${body}`)) clearBookmarks();
      return;
    }
    Alert.alert(title, body, [
      { text: cancel, style: 'cancel' },
      { text: remove, style: 'destructive', onPress: clearBookmarks },
    ]);
  };

  const clearCache = async () => {
    await clearQueryCache(client);
    clearHistory();
    Alert.alert(strings.settings.cacheCleared, strings.settings.cacheClearedBody);
  };

  return {
    state: { themeMode: mode, themeModes: MODES },
    actions: { setThemeMode, confirmClearBookmarks, clearCache },
  };
}
