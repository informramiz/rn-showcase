import { View } from 'react-native';
import { strings } from '@/shared/i18n/strings';
import { StoryList } from '@/shared/ui/StoryList';
import { useBookmarksViewModel } from './useBookmarksViewModel';

export function BookmarksScreen() {
  const { state, actions } = useBookmarksViewModel();
  return (
    <View style={{ flex: 1 }}>
      <StoryList
        testID="bookmarks-list"
        stories={state.stories}
        readIds={state.readIds}
        onOpen={actions.openStory}
        emptyTitle={strings.list.noBookmarks}
        emptyHint={strings.list.noBookmarksHint}
        swipe={state.swipe}
      />
    </View>
  );
}
