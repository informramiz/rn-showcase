import { View } from 'react-native';
import { StoryList } from '../../src/components/StoryList';
import { strings } from '../../src/i18n/strings';
import { useBookmarks } from '../../src/store/bookmarks';

export default function BookmarksScreen() {
  const items = useBookmarks((s) => s.items);
  return (
    <View style={{ flex: 1 }}>
      <StoryList
        testID="bookmarks-list"
        stories={items}
        emptyTitle={strings.list.noBookmarks}
        emptyHint={strings.list.noBookmarksHint}
      />
    </View>
  );
}
