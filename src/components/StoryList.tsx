import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';
import type { StorySummary } from '../api';
import { useHistory } from '../store/history';
import { useTheme } from '../theme';
import { EmptyState } from './ErrorState';
import { StoryRow } from './StoryRow';

interface Props {
  stories: StorySummary[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  loadingMore?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  testID?: string;
}

export function StoryList({
  stories,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore,
  emptyTitle,
  emptyHint,
  testID,
}: Props) {
  const router = useRouter();
  const { colors } = useTheme();
  const markRead = useHistory((s) => s.markRead);

  const open = useCallback(
    (story: StorySummary) => {
      router.push({ pathname: '/story/[id]', params: { id: String(story.id) } });
      markRead(story);
    },
    [router, markRead],
  );

  return (
    <FlashList
      testID={testID}
      data={stories}
      keyExtractor={(s) => String(s.id)}
      renderItem={({ item, index }) => <StoryRow story={item} index={index} onPress={open} />}
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
