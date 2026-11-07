import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { CommentThread } from '../../src/components/CommentThread';
import { ErrorState } from '../../src/components/ErrorState';
import { StoryRowSkeleton } from '../../src/components/Skeleton';
import { useItem } from '../../src/hooks/useItem';
import { htmlToText } from '../../src/lib/comments';
import { hostname, timeAgo } from '../../src/lib/format';
import { toSummary, useBookmarks } from '../../src/store/bookmarks';
import { useHistory } from '../../src/store/history';
import { useTheme } from '../../src/theme';

export default function StoryDetailScreen() {
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);
  const { colors } = useTheme();
  const { data: story, isPending, error, refetch } = useItem(id);
  const bookmarked = useBookmarks((s) => s.items.some((i) => i.id === id));
  const toggleBookmark = useBookmarks((s) => s.toggle);
  const markRead = useHistory((s) => s.markRead);

  useEffect(() => {
    if (story) markRead(toSummary(story));
  }, [story, markRead]);

  if (isPending) return <StoryRowSkeleton />;
  if (error || !story) return <ErrorState error={error} onRetry={() => refetch()} />;

  const host = hostname(story.url);
  return (
    <ScrollView testID="story-detail" contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ title: host || 'Story' }} />
      <View style={{ padding: 16, gap: 8, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 26 }}>
          {story.title}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {story.score ?? 0} pts · {story.by} · {timeAgo(story.time)} · {story.descendants ?? 0} comments
        </Text>
        {story.text ? (
          <Text style={{ color: colors.text, lineHeight: 21 }}>{htmlToText(story.text)}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {story.url ? (
            <Pressable
              testID="open-link"
              accessibilityRole="button"
              onPress={() => WebBrowser.openBrowserAsync(story.url as string)}
              style={{
                flex: 1,
                backgroundColor: colors.accent,
                padding: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Open link</Text>
            </Pressable>
          ) : null}
          <Pressable
            testID="bookmark-button"
            accessibilityRole="button"
            accessibilityState={{ selected: bookmarked }}
            onPress={() => toggleBookmark(toSummary(story))}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.accent,
              padding: 12,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.accent, fontWeight: '600' }}>{bookmarked ? 'Saved' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>
      {story.kids?.length ? (
        <CommentThread rootIds={story.kids} />
      ) : (
        <Text style={{ color: colors.textMuted, padding: 16 }}>No comments yet.</Text>
      )}
    </ScrollView>
  );
}
