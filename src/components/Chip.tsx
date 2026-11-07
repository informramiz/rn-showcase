import type { ReactNode } from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';
import { radius, spacing, useTheme } from '../theme';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
  /** Fill the row equally (segmented control look). */
  grow?: boolean;
}

/** Selectable pill used for feed tabs and theme choices. */
export function Chip({
  label,
  active,
  onPress,
  testID,
  accessibilityRole = 'tab',
  grow,
}: ChipProps): ReactNode {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{
        flex: grow ? 1 : undefined,
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.accent : colors.background,
      }}
    >
      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
