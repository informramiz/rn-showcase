import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { FEEDS, type FeedKind } from '../../src/api';
import { ErrorState } from '../../src/components/ErrorState';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { StoryListSkeleton } from '../../src/components/Skeleton';
import { StoryList } from '../../src/components/StoryList';
import { useStories } from '../../src/hooks/useStories';
import { strings } from '../../src/i18n/strings';
import { toSummary } from '../../src/store/bookmarks';
import { useTheme } from '../../src/theme';

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
                <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>
                  {strings.feeds[f]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {q.isPending ? (
        <StoryListSkeleton />
      ) : q.isError && q.stories.length === 0 ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <StoryList
          testID="story-list"
          stories={q.stories.map(toSummary)}
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
