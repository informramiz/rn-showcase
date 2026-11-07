import Constants from 'expo-constants';
import { ScrollView, Text, View } from 'react-native';
import { strings } from '@/shared/i18n/strings';
import { spacing, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { useSettingsViewModel } from './useSettingsViewModel';

export function SettingsScreen() {
  const { colors } = useTheme();
  const { state, actions } = useSettingsViewModel();

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
          {state.themeModes.map((m) => (
            <Chip
              key={m}
              grow
              testID={`theme-${m}`}
              accessibilityRole="radio"
              label={strings.settings.themeModes[m]}
              active={m === state.themeMode}
              onPress={() => actions.setThemeMode(m)}
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
          onPress={() => void actions.clearCache()}
        />
        <Button
          variant="dangerSurface"
          centered={false}
          label={strings.settings.removeBookmarks}
          onPress={actions.confirmClearBookmarks}
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
