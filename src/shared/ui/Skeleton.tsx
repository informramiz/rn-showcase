import { useEffect, useState } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';
import { useTheme } from '@/shared/theme';

function Bar({ style }: { style: ViewStyle }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ backgroundColor: colors.skeleton, borderRadius: 6, opacity }, style]} />;
}

export function StoryRowSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ padding: 16, gap: 8, borderBottomWidth: 1, borderColor: colors.border }}>
      <Bar style={{ height: 16, width: '90%' }} />
      <Bar style={{ height: 16, width: '60%' }} />
      <Bar style={{ height: 12, width: '40%' }} />
    </View>
  );
}

export function StoryListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <View testID="story-skeleton">
      {Array.from({ length: count }, (_, i) => (
        <StoryRowSkeleton key={i} />
      ))}
    </View>
  );
}
