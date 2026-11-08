import { useRef, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Swipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import type { StorySummary } from '@/shared/api';
import { useTheme } from '@/shared/theme';

/** Optional swipe actions for a story list. A missing handler means no panel on that side. */
export interface SwipeActions {
  /** Swipe right. */
  onBookmark?: (story: StorySummary) => void;
  /** Swipe left. */
  onDismiss?: (story: StorySummary) => void;
  bookmarkLabel?: (story: StorySummary) => string;
  dismissLabel: string;
}

interface Props {
  story: StorySummary;
  actions: SwipeActions;
  children: ReactNode;
}

const PANEL_WIDTH = 96;

/**
 * ReanimatedSwipeable row: releasing past half the panel width opens it, which
 * runs the action and springs the row back.
 */
export function SwipeableStoryRow({ story, actions, children }: Props) {
  const { colors } = useTheme();
  const ref = useRef<SwipeableMethods>(null);
  const { onBookmark, onDismiss } = actions;

  const run = (action: ((s: StorySummary) => void) | undefined) => {
    ref.current?.close();
    action?.(story);
  };

  const panel = (testID: string, label: string, color: string) => (
    <View
      testID={testID}
      style={{ width: PANEL_WIDTH, alignItems: 'center', justifyContent: 'center', backgroundColor: color }}
    >
      <Text style={{ color: '#fff', fontWeight: '600' }}>{label}</Text>
    </View>
  );

  return (
    <Swipeable
      ref={ref}
      testID={`swipe-row-${String(story.id)}`}
      friction={2}
      overshootFriction={8}
      renderLeftActions={
        onBookmark
          ? () =>
              panel(`swipe-bookmark-${String(story.id)}`, actions.bookmarkLabel?.(story) ?? '', colors.accent)
          : undefined
      }
      renderRightActions={
        onDismiss
          ? () => panel(`swipe-dismiss-${String(story.id)}`, actions.dismissLabel, colors.danger)
          : undefined
      }
      onSwipeableOpen={(direction) => run(direction === SwipeDirection.RIGHT ? onBookmark : onDismiss)}
    >
      {children}
    </Swipeable>
  );
}
