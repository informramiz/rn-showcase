import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button } from '../../src/components/Button';
import { CommentThread } from '../../src/components/CommentThread';
import { ErrorState } from '../../src/components/ErrorState';
import { StoryRowSkeleton } from '../../src/components/Skeleton';
import { useItem } from '../../src/hooks/useItem';
import { htmlToText } from '../../src/lib/comments';
import { hostname, timeAgo } from '../../src/lib/format';
import { strings } from '../../src/i18n/strings';
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
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const url = story.url;
  const host = hostname(url);
  return (
    <ScrollView testID="story-detail" contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ title: host || strings.story.screenTitle }} />
      <View style={{ padding: 16, gap: 8, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 26 }}>
          {story.title}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {strings.story.points(story.score ?? 0)} · {story.by} · {timeAgo(story.time)} ·{' '}
          {strings.story.comments(story.descendants ?? 0)}
        </Text>
        {story.text ? (
          <Text style={{ color: colors.text, lineHeight: 21 }}>{htmlToText(story.text)}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {url ? (
            <Button
              testID="open-link"
              label={strings.story.openLink}
              grow
              onPress={() => void WebBrowser.openBrowserAsync(url)}
            />
          ) : null}
          <Button
            testID="bookmark-button"
            variant="outline"
            grow
            selected={bookmarked}
            label={bookmarked ? strings.story.saved : strings.story.save}
            onPress={() => toggleBookmark(toSummary(story))}
          />
        </View>
      </View>
      {story.kids?.length ? (
        <CommentThread rootIds={story.kids} />
      ) : (
        <Text style={{ color: colors.textMuted, padding: 16 }}>{strings.story.noComments}</Text>
      )}
    </ScrollView>
  );
}
