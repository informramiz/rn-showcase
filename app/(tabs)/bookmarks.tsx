import { View } from 'react-native';
import { StoryList } from '../../src/components/StoryList';
import { useBookmarks } from '../../src/store/bookmarks';

export default function BookmarksScreen() {
  const items = useBookmarks((s) => s.items);
  return (
    <View style={{ flex: 1 }}>
      <StoryList
        testID="bookmarks-list"
        stories={items}
        emptyTitle="No bookmarks yet"
        emptyHint="Open a story and tap Save. Saved stories stay available offline."
      />
    </View>
  );
}
