import { Stack } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { strings } from '@/shared/i18n/strings';
import { timeAgo } from '@/shared/lib/format';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { ErrorState } from '@/shared/ui/ErrorState';
import { StoryRowSkeleton } from '@/shared/ui/Skeleton';
import { CommentThread } from './CommentThread';
import { useStoryDetailViewModel } from './useStoryDetailViewModel';

export function StoryDetailScreen() {
  const { colors } = useTheme();
  const { state, actions } = useStoryDetailViewModel();
  const { story } = state;

  if (state.isPending) return <StoryRowSkeleton />;
  if (state.error || !story) return <ErrorState error={state.error} onRetry={actions.retry} />;

  return (
    <ScrollView testID="story-detail" contentContainerStyle={{ paddingBottom: 48 }}>
      <Stack.Screen options={{ title: state.host || strings.story.screenTitle }} />
      <View style={{ padding: 16, gap: 8, backgroundColor: colors.surface }}>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700', lineHeight: 26 }}>
          {story.title}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {strings.story.points(story.score ?? 0)} · {story.by} · {timeAgo(story.time)} ·{' '}
          {strings.story.comments(story.descendants ?? 0)}
        </Text>
        {state.bodyText ? <Text style={{ color: colors.text, lineHeight: 21 }}>{state.bodyText}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
          {state.canOpenLink ? (
            <Button testID="open-link" label={strings.story.openLink} grow onPress={actions.openLink} />
          ) : null}
          <Button
            testID="bookmark-button"
            variant="outline"
            grow
            selected={state.bookmarked}
            label={state.bookmarked ? strings.story.saved : strings.story.save}
            onPress={actions.toggleBookmark}
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
