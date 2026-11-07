import { useCallback } from 'react';
import { View } from 'react-native';
import { useCommentThread } from '../hooks/useCommentThread';
import { useItem } from '../hooks/useItem';
import { CommentRow } from './CommentRow';

interface NodeProps {
  id: number;
  depth: number;
  expanded: ReadonlySet<number>;
  onToggle: (id: number) => void;
}

/** One comment plus, when expanded, its replies. Each node reads its own cache entry. */
function CommentNode({ id, depth, expanded, onToggle }: NodeProps) {
  const { data: item, isPending, refetch } = useItem(id);
  const retry = useCallback(() => void refetch(), [refetch]);
  if (item?.deleted || item?.dead) return null;
  const kids = item?.kids ?? [];
  const isExpanded = expanded.has(id);
  return (
    <>
      <CommentRow
        id={id}
        depth={depth}
        item={item}
        loading={isPending}
        replyCount={kids.length}
        expanded={isExpanded}
        onToggle={onToggle}
        onRetry={retry}
      />
      {isExpanded &&
        kids.map((kid) => (
          <CommentNode key={kid} id={kid} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
        ))}
    </>
  );
}

/** Renders the lazy comment tree as a plain column; the parent screen scrolls. */
export function CommentThread({ rootIds }: { rootIds: readonly number[] }) {
  const { expanded, toggle } = useCommentThread();
  return (
    <View testID="comment-thread">
      {rootIds.map((id) => (
        <CommentNode key={id} id={id} depth={0} expanded={expanded} onToggle={toggle} />
      ))}
    </View>
  );
}
