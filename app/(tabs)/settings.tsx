import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { clearQueryCache } from '../../src/hooks/queryClient';
import { strings } from '../../src/i18n/strings';
import { useBookmarks } from '../../src/store/bookmarks';
import { useHistory } from '../../src/store/history';
import { useSettings, type ThemeMode } from '../../src/store/settings';
import { spacing, useTheme } from '../../src/theme';

const MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const client = useQueryClient();
  const mode = useSettings((s) => s.themeMode);
  const setMode = useSettings((s) => s.setThemeMode);
  const clearHistory = useHistory((s) => s.clear);
  const clearBookmarks = useBookmarks((s) => s.clear);

  const onClearBookmarks = () => {
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

  const onClearCache = async () => {
    await clearQueryCache(client);
    clearHistory();
    Alert.alert(strings.settings.cacheCleared, strings.settings.cacheClearedBody);
  };

  const section = {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase' as const,
    marginBottom: spacing.sm,
  };

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
      <View>
        <Text style={section}>{strings.settings.theme}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {MODES.map((m) => (
            <Chip
              key={m}
              grow
              testID={`theme-${m}`}
              accessibilityRole="radio"
              label={strings.settings.themeModes[m]}
              active={m === mode}
              onPress={() => setMode(m)}
            />
          ))}
        </View>
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={section}>{strings.settings.data}</Text>
        <Button
          testID="clear-cache"
          variant="surface"
          centered={false}
          label={strings.settings.clearCache}
          onPress={() => void onClearCache()}
        />
        <Button
          variant="dangerSurface"
          centered={false}
          label={strings.settings.removeBookmarks}
          onPress={onClearBookmarks}
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={section}>{strings.settings.about}</Text>
        <Text style={{ color: colors.text }}>
          {strings.settings.appName} {Constants.expoConfig?.version ?? ''}
        </Text>
        <Text style={{ color: colors.textMuted }}>{strings.settings.disclaimer}</Text>
      </View>
    </ScrollView>
  );
}
