import { ScrollView, View } from 'react-native';
import { strings } from '@/shared/i18n/strings';
import { spacing, useTheme } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { ErrorState } from '@/shared/ui/ErrorState';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { StoryListSkeleton } from '@/shared/ui/Skeleton';
import { StoryList } from '@/shared/ui/StoryList';
import { useStoriesViewModel } from './useStoriesViewModel';

export function StoriesScreen() {
  const { colors } = useTheme();
  const { state, actions } = useStoriesViewModel();

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.sm, gap: spacing.sm }}
        >
          {state.feeds.map((f) => (
            <Chip
              key={f}
              testID={`feed-${f}`}
              label={strings.feeds[f]}
              active={f === state.feed}
              onPress={() => actions.selectFeed(f)}
            />
          ))}
        </ScrollView>
      </View>
      {state.isPending ? (
        <StoryListSkeleton />
      ) : state.showError ? (
        <ErrorState error={state.error} onRetry={actions.retry} />
      ) : (
        <StoryList
          testID="story-list"
          stories={state.stories}
          readIds={state.readIds}
          onOpen={actions.openStory}
          refreshing={state.refreshing}
          onRefresh={actions.refresh}
          onEndReached={actions.loadMore}
          loadingMore={state.loadingMore}
          emptyTitle={strings.list.noStories}
          swipe={state.swipe}
        />
      )}
    </View>
  );
}
