import { useQueryClient } from '@tanstack/react-query';
import { Alert, Platform } from 'react-native';
import { useClearBookmarks } from '@/features/bookmarks/useBookmarks';
import { useClearHistory } from '@/features/history/useHistory';
import { strings } from '@/shared/i18n/strings';
import { useServices } from '@/shared/services/AppServices';
import { useSettings, type ThemeMode } from './store';

const MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export function useSettingsViewModel() {
  const client = useQueryClient();
  const { repos } = useServices();
  const mode = useSettings((s) => s.themeMode);
  const setThemeMode = useSettings((s) => s.setThemeMode);
  const clearHistory = useClearHistory();
  const clearBookmarks = useClearBookmarks();

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
    await clearHistory();
    // Prune everything not pinned by a bookmark or note, then drop in-memory server state.
    await repos.cache.prune(Number.MAX_SAFE_INTEGER);
    client.removeQueries({ predicate: (q) => q.queryKey[0] !== 'db' });
    Alert.alert(strings.settings.cacheCleared, strings.settings.cacheClearedBody);
  };

  return {
    state: { themeMode: mode, themeModes: MODES },
    actions: { setThemeMode, confirmClearBookmarks, clearCache },
  };
}
