import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { clearQueryCache } from '../../src/hooks/queryClient';
import { useBookmarks } from '../../src/store/bookmarks';
import { useHistory } from '../../src/store/history';
import { useSettings, type ThemeMode } from '../../src/store/settings';
import { useTheme } from '../../src/theme';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

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
    Alert.alert('Cache cleared', 'Cached stories and reading history were removed. Bookmarks are kept.');
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
        <Text style={section}>Theme</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {MODES.map((m) => {
            const active = m.value === mode;
            return (
              <Pressable
                key={m.value}
                testID={`theme-${m.value}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => setMode(m.value)}
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
                <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={section}>Data</Text>
        <Pressable testID="clear-cache" accessibilityRole="button" onPress={onClearCache} style={button}>
          <Text style={{ color: colors.text }}>Clear cache and history</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={clearBookmarks} style={button}>
          <Text style={{ color: colors.danger }}>Remove all bookmarks</Text>
        </Pressable>
      </View>

      <View style={{ gap: 8 }}>
        <Text style={section}>About</Text>
        <Text style={{ color: colors.text }}>HN Reader {Constants.expoConfig?.version ?? ''}</Text>
        <Text style={{ color: colors.textMuted }}>
          Data from the public Hacker News API. Not affiliated with Y Combinator.
        </Text>
      </View>
    </ScrollView>
  );
}
