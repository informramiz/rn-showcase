import { Text, View } from 'react-native';
import { useIsOnline } from '../hooks/useOnline';
import { useTheme } from '../theme';

export function OfflineBanner() {
  const online = useIsOnline();
  const { colors } = useTheme();
  if (online) return null;
  return (
    <View testID="offline-banner" style={{ backgroundColor: colors.banner, padding: 8 }}>
      <Text style={{ color: '#fff', textAlign: 'center' }}>You are offline. Showing saved data.</Text>
    </View>
  );
}
