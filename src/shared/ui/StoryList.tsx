import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useCallback } from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
import type { StorySummary } from '@/shared/api';
import { useTheme } from '@/shared/theme';
import { EmptyState } from './ErrorState';
import { StoryRow } from './StoryRow';
import { SwipeableStoryRow, type SwipeActions } from './SwipeableStoryRow';

interface Props {
  stories: StorySummary[];
  /** Ids of stories already read; those rows are dimmed. */
  readIds: ReadonlySet<number>;
  onOpen: (story: StorySummary) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  testID?: string;
  /** Enables swipe-to-bookmark / swipe-to-dismiss rows. */
  swipe?: SwipeActions;
}

const keyExtractor = (s: StorySummary) => String(s.id);

export function StoryList({
  stories,
  readIds,
  onOpen,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore,
  emptyTitle,
  emptyHint,
  testID,
  swipe,
}: Props) {
  const { colors } = useTheme();
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<StorySummary>) => {
      const row = <StoryRow story={item} index={index} read={readIds.has(item.id)} onPress={onOpen} />;
      return swipe ? (
        <SwipeableStoryRow story={item} actions={swipe}>
          {row}
        </SwipeableStoryRow>
      ) : (
        row
      );
    },
    [readIds, onOpen, swipe],
  );

  return (
    <FlashList
      testID={testID}
      data={stories}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        ) : undefined
      }
      ListFooterComponent={
        loadingMore ? <ActivityIndicator style={{ margin: 16 }} color={colors.accent} /> : null
      }
      ListEmptyComponent={emptyTitle ? <EmptyState title={emptyTitle} hint={emptyHint} /> : null}
    />
  );
}
