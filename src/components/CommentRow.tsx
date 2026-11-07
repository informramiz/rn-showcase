import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { HNItem } from '../api';
import { htmlToText } from '../lib/comments';
import { timeAgo } from '../lib/format';
import { useTheme } from '../theme';

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
          <Text style={{ color: colors.textMuted }}>Loading comment…</Text>
        ) : (
          <Pressable onPress={onRetry} accessibilityRole="button">
            <Text style={{ color: colors.danger }}>Failed to load. Tap to retry.</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const hint =
    replyCount === 0
      ? ''
      : expanded
        ? 'Tap to collapse'
        : `${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}, tap to expand`;
  return (
    <Pressable
      testID={`comment-${id}`}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={() => onToggle(id)}
      style={[{ padding: 12, backgroundColor: colors.surface }, indent]}
    >
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        {item.by ?? 'unknown'} · {timeAgo(item.time)}
      </Text>
      <Text style={{ color: colors.text, marginTop: 4, lineHeight: 20 }}>{htmlToText(item.text)}</Text>
      {hint ? <Text style={{ color: colors.accent, fontSize: 12, marginTop: 6 }}>{hint}</Text> : null}
    </Pressable>
  );
}

export const CommentRow = memo(CommentRowBase);
