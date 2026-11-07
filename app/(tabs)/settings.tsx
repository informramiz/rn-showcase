import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { clearQueryCache } from '../../src/hooks/queryClient';
import { strings } from '../../src/i18n/strings';
import { useBookmarks } from '../../src/store/bookmarks';
import { useHistory } from '../../src/store/history';
import { useSettings, type ThemeMode } from '../../src/store/settings';
import { useTheme } from '../../src/theme';

const MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const client = useQueryClient();
  const mode = useSettings((s) => s.themeMode);
  const setMode = useSettings((s) => s.setThemeMode);
  const clearHistory = useHistory((s) => s.clear);
  const clearBookmarks = useBookmarks((s) => s.clear);

  const onClearCache = async () => {
    await clearQueryCache(client);
    clearHistory();
    Alert.alert(strings.settings.cacheCleared, strings.settings.cacheClearedBody);
  };

  const section = {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  };
  const button = {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
      <View>
        <Text style={section}>{strings.settings.theme}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {MODES.map((m) => {
            const active = m === mode;
            return (
              <Pressable
                key={m}
                testID={`theme-${m}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: active ? colors.accent : colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>
                  {strings.settings.themeModes[m]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={section}>{strings.settings.data}</Text>
        <Pressable testID="clear-cache" accessibilityRole="button" onPress={onClearCache} style={button}>
          <Text style={{ color: colors.text }}>{strings.settings.clearCache}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={clearBookmarks} style={button}>
          <Text style={{ color: colors.danger }}>{strings.settings.removeBookmarks}</Text>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={section}>{strings.settings.about}</Text>
        <Text style={{ color: colors.text }}>
          {strings.settings.appName} {Constants.expoConfig?.version ?? ''}
        </Text>
        <Text style={{ color: colors.textMuted }}>{strings.settings.disclaimer}</Text>
      </View>
    </ScrollView>
  );
}
