import { Pressable, Text, View } from 'react-native';
import { describeError } from '../api';
import { strings } from '../i18n/strings';
import { useTheme } from '../theme';

function errorMessage(error: unknown): string {
  const { kind, status } = describeError(error);
  return kind === 'http' ? strings.error.http(status) : strings.error[kind];
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { colors } = useTheme();
  return (
    <View testID="error-state" style={{ padding: 32, alignItems: 'center', gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{strings.error.title}</Text>
      <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{errorMessage(error)}</Text>
      <Pressable
        testID="retry-button"
        accessibilityRole="button"
        onPress={onRetry}
        style={{
          backgroundColor: colors.accent,
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600' }}>{strings.error.retry}</Text>
      </Pressable>
    </View>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>{title}</Text>
      {hint ? <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{hint}</Text> : null}
    </View>
  );
}
