import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { FEEDS, type FeedKind } from '../../src/api';
import { Chip } from '../../src/components/Chip';
import { ErrorState } from '../../src/components/ErrorState';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { StoryListSkeleton } from '../../src/components/Skeleton';
import { StoryList } from '../../src/components/StoryList';
import { useStories } from '../../src/hooks/useStories';
import { strings } from '../../src/i18n/strings';
import { toSummary } from '../../src/store/bookmarks';
import { spacing, useTheme } from '../../src/theme';

export default function StoriesScreen() {
  const [feed, setFeed] = useState<FeedKind>('top');
  const { colors } = useTheme();
  const q = useStories(feed);
  const summaries = useMemo(() => q.stories.map(toSummary), [q.stories]);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: spacing.sm, gap: spacing.sm }}
        >
          {FEEDS.map((f) => (
            <Chip
              key={f}
              testID={`feed-${f}`}
              label={strings.feeds[f]}
              active={f === feed}
              onPress={() => setFeed(f)}
            />
          ))}
        </ScrollView>
      </View>
      {q.isPending ? (
        <StoryListSkeleton />
      ) : q.isError && q.stories.length === 0 ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <StoryList
          testID="story-list"
          stories={summaries}
          refreshing={q.refreshing}
          onRefresh={() => void q.refresh()}
          onEndReached={() => {
            if (q.hasNextPage && !q.isFetchingNextPage) void q.fetchNextPage();
          }}
          loadingMore={q.isFetchingNextPage}
          emptyTitle={strings.list.noStories}
        />
      )}
    </View>
  );
}
