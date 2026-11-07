import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { ThreadRow } from '../lib/comments';
import { htmlToText } from '../lib/comments';
import { timeAgo } from '../lib/format';
import { useTheme } from '../theme';

interface Props {
  row: ThreadRow;
  onToggle: (id: number) => void;
  onRetry: (id: number) => void;
}

const INDENT = 14;

function CommentRowBase({ row, onToggle, onRetry }: Props) {
  const { colors } = useTheme();
  const { state, depth } = row;
  const indent = {
    marginLeft: Math.min(depth, 6) * INDENT,
    borderLeftWidth: depth > 0 ? 2 : 0,
    borderColor: colors.border,
  };

  if (state.status !== 'loaded') {
    return (
      <View style={[{ padding: 12 }, indent]}>
        {state.status === 'loading' ? (
          <Text style={{ color: colors.textMuted }}>Loading comment…</Text>
        ) : (
          <Pressable onPress={() => onRetry(row.id)} accessibilityRole="button">
            <Text style={{ color: colors.danger }}>Failed to load. Tap to retry.</Text>
          </Pressable>
        )}
      </View>
    );
  }

  const { item } = state;
  const hint =
    row.replyCount === 0
      ? ''
      : row.expanded
        ? 'Tap to collapse'
        : `${row.replyCount} ${row.replyCount === 1 ? 'reply' : 'replies'}, tap to expand`;
  return (
    <Pressable
      testID={`comment-${row.id}`}
      accessibilityRole="button"
      accessibilityState={{ expanded: row.expanded }}
      onPress={() => onToggle(row.id)}
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
