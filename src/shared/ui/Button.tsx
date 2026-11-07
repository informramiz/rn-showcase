import type { ReactNode } from 'react';
import { Pressable, Text, type AccessibilityRole, type PressableProps } from 'react-native';
import { radius, spacing, useTheme } from '@/shared/theme';

type Variant = 'primary' | 'outline' | 'surface' | 'dangerSurface';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** Stretch to share a row equally with sibling buttons. */
  grow?: boolean;
  centered?: boolean;
  selected?: boolean;
  testID?: string;
  accessibilityRole?: PressableProps['accessibilityRole'];
}

/** Themed button. Text and border colours come from the variant. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  grow,
  centered = true,
  selected,
  testID,
  accessibilityRole = 'button' satisfies AccessibilityRole,
}: ButtonProps): ReactNode {
  const { colors } = useTheme();
  const look = {
    primary: { bg: colors.accent, fg: '#fff', border: colors.accent },
    outline: { bg: 'transparent', fg: colors.accent, border: colors.accent },
    surface: { bg: colors.surface, fg: colors.text, border: colors.border },
    dangerSurface: { bg: colors.surface, fg: colors.danger, border: colors.border },
  }[variant];
  return (
    <Pressable
      testID={testID}
      accessibilityRole={accessibilityRole}
      accessibilityState={selected === undefined ? undefined : { selected }}
      onPress={onPress}
      style={{
        flex: grow ? 1 : undefined,
        alignItems: centered ? 'center' : undefined,
        backgroundColor: look.bg,
        borderColor: look.border,
        borderWidth: 1,
        borderRadius: radius.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
      }}
    >
      <Text style={{ color: look.fg, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}
