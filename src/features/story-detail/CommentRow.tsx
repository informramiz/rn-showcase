import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HNItem } from '@/shared/api';
import { htmlToText } from './comments';
import { strings } from '@/shared/i18n/strings';
import { timeAgo } from '@/shared/lib/format';
import { useTheme } from '@/shared/theme';

interface Props {
  id: number;
  depth: number;
  /** Undefined while loading or when the load failed. */
  item: HNItem | undefined;
  loading: boolean;
  replyCount: number;
  expanded: boolean;
  onToggle: (id: number) => void;
  onRetry: () => void;
}

const INDENT = 14;

function CommentRowBase({ id, depth, item, loading, replyCount, expanded, onToggle, onRetry }: Props) {
  const { colors } = useTheme();
  const indent = {
    marginLeft: Math.min(depth, 6) * INDENT,
    borderLeftWidth: depth > 0 ? 2 : 0,
    borderColor: colors.border,
  };

  if (!item) {
    return (
      <View style={[{ padding: 12 }, indent]}>
        {loading ? (
          <Text style={{ color: colors.textMuted }}>{strings.comment.loading}</Text>
        ) : (
          <Pressable onPress={onRetry} accessibilityRole="button">
            <Text style={{ color: colors.danger }}>{strings.comment.failed}</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const hint =
    replyCount === 0 ? '' : expanded ? strings.comment.collapse : strings.comment.expand(replyCount);
  return (
    <Pressable
      testID={`comment-${id}`}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={() => onToggle(id)}
      style={[{ padding: 12, backgroundColor: colors.surface }, indent]}
    >
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        {item.by ?? strings.story.unknownAuthor} · {timeAgo(item.time)}
      </Text>
      <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}>{htmlToText(item.text)}</Text>
      {hint ? <Text style={{ color: colors.accent, fontSize: 12, marginTop: 6 }}>{hint}</Text> : null}
    </Pressable>
  );
}

export const CommentRow = memo(CommentRowBase);
