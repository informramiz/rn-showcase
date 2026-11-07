import { Text, View } from 'react-native';
import { useIsOnline } from '@/shared/hooks/useOnline';
import { strings } from '@/shared/i18n/strings';
import { useTheme } from '@/shared/theme';

export function OfflineBanner() {
  const online = useIsOnline();
  const { colors } = useTheme();
  if (online) return null;
  return (
    <View testID="offline-banner" style={{ backgroundColor: colors.banner, padding: 8 }}>
      <Text style={{ color: '#fff', textAlign: 'center' }}>{strings.offline}</Text>
    </View>
  );
}
