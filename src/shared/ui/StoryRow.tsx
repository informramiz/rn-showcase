import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { hostname, timeAgo } from '@/shared/lib/format';
import { strings } from '@/shared/i18n/strings';
import { useTheme } from '@/shared/theme';
import type { StorySummary } from '@/shared/api';

interface Props {
  story: StorySummary;
  index: number;
  read: boolean;
  onPress: (story: StorySummary) => void;
}

function StoryRowBase({ story, index, read, onPress }: Props) {
  const { colors } = useTheme();
  const meta = [
    story.score != null ? strings.story.points(story.score) : null,
    story.by,
    timeAgo(story.time),
    story.descendants != null ? strings.story.comments(story.descendants) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const host = hostname(story.url);
  return (
    <Pressable
      testID={`story-item-${index}`}
      accessibilityRole="button"
      onPress={() => onPress(story)}
      style={{
        padding: 16,
        borderBottomWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        opacity: read ? 0.55 : 1,
      }}
    >
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', lineHeight: 22 }}>
        {story.title}
      </Text>
      {host ? <Text style={{ color: colors.accent, fontSize: 12, marginTop: 2 }}>{host}</Text> : null}
      <View style={{ marginTop: 6 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{meta}</Text>
      </View>
    </Pressable>
  );
}

export const StoryRow = memo(StoryRowBase);
