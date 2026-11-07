import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { hostname, timeAgo } from '../lib/format';
import { useIsRead } from '../store/history';
import { useTheme } from '../theme';
import type { StorySummary } from '../api';

interface Props {
  story: StorySummary;
  index: number;
  onPress: (story: StorySummary) => void;
}

function StoryRowBase({ story, index, onPress }: Props) {
  const { colors } = useTheme();
  const read = useIsRead(story.id);
  const meta = [
    story.score != null ? `${story.score} pts` : null,
    story.by,
    timeAgo(story.time),
    story.descendants != null ? `${story.descendants} comments` : null,
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
