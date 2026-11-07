import { useCommentThread } from '../hooks/useCommentThread';
import { CommentRow } from './CommentRow';
import { View } from 'react-native';

/** Renders the lazy comment tree as a plain column; the parent screen scrolls. */
export function CommentThread({ rootIds }: { rootIds: readonly number[] }) {
  const { rows, toggle, retry } = useCommentThread(rootIds);
  return (
    <View testID="comment-thread">
      {rows.map((row) => (
        <CommentRow key={row.id} row={row} onToggle={toggle} onRetry={retry} />
      ))}
    </View>
  );
}
