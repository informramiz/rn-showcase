import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { FEEDS, type FeedKind } from '../../src/api';
import { ErrorState } from '../../src/components/ErrorState';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { StoryListSkeleton } from '../../src/components/Skeleton';
import { StoryList } from '../../src/components/StoryList';
import { useStories } from '../../src/hooks/useStories';
import { toSummary } from '../../src/store/bookmarks';
import { useTheme } from '../../src/theme';

const LABEL: Record<FeedKind, string> = { top: 'Top', new: 'New', best: 'Best', ask: 'Ask', show: 'Show' };

export default function StoriesScreen() {
  const [feed, setFeed] = useState<FeedKind>('top');
  const { colors } = useTheme();
  const q = useStories(feed);

  return (
    <View style={{ flex: 1 }}>
      <OfflineBanner />
      <View style={{ backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ padding: 8, gap: 8 }}
        >
          {FEEDS.map((f) => {
            const active = f === feed;
            return (
              <Pressable
                key={f}
                testID={`feed-${f}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setFeed(f)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: active ? colors.accent : colors.background,
                }}
              >
                <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>{LABEL[f]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {q.isPending ? (
        <StoryListSkeleton />
      ) : q.isError && q.stories.length === 0 ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <StoryList
          testID="story-list"
          stories={q.stories.map(toSummary)}
          refreshing={q.refreshing}
          onRefresh={q.refresh}
          onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
          loadingMore={q.isFetchingNextPage}
          emptyTitle="No stories"
        />
      )}
    </View>
  );
}
