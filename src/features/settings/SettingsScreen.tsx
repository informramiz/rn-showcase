import Constants from 'expo-constants';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useSyncStatus } from '@/features/sync/useSyncStatus';
import { strings } from '@/shared/i18n/strings';
import { spacing, useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { Chip } from '@/shared/ui/Chip';
import { useCommentAlerts } from './useCommentAlerts';
import { useSettingsViewModel } from './useSettingsViewModel';

export function SettingsScreen() {
  const { colors } = useTheme();
  const { state, actions } = useSettingsViewModel();
  const sync = useSyncStatus();
  const alerts = useCommentAlerts();

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
        <Text style={section}>{strings.settings.sync}</Text>
        <Text testID="sync-status" style={{ color: colors.text }}>
          {strings.settings.syncStatus(sync.status.pending, sync.status.failed)}
        </Text>
        <Text style={{ color: colors.textMuted }}>{strings.settings.syncHelp}</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button
            testID="sync-now"
            variant="surface"
            grow
            label={strings.settings.syncNow}
            onPress={sync.syncNow}
          />
          {sync.status.failed > 0 ? (
            <Button
              testID="sync-retry"
              variant="outline"
              grow
              label={strings.settings.retryFailed}
              onPress={sync.retryFailed}
            />
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text }}>{strings.settings.flaky}</Text>
          <Switch testID="sync-flaky" value={sync.flaky} onValueChange={sync.setFlaky} />
        </View>
      </View>

      {alerts.supported && alerts.permission ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={section}>{strings.settings.alerts}</Text>
          <Text testID="alerts-status" style={{ color: colors.text }}>
            {strings.settings.alertStatus[alerts.permission]}
          </Text>
          <Text style={{ color: colors.textMuted }}>{strings.settings.alertsHelp}</Text>
          {alerts.permission === 'undetermined' ? (
            <Button testID="alerts-enable" label={strings.settings.enableAlerts} onPress={alerts.enable} />
          ) : null}
          {alerts.permission === 'denied' ? (
            <Button
              testID="alerts-settings"
              variant="surface"
              label={strings.settings.openSystemSettings}
              onPress={alerts.openSystemSettings}
            />
          ) : null}
        </View>
      ) : null}

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
