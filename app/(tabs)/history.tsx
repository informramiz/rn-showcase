import { useMemo } from 'react';
import { View } from 'react-native';
import { StoryList } from '../../src/components/StoryList';
import { strings } from '../../src/i18n/strings';
import { useHistory } from '../../src/store/history';

export default function HistoryScreen() {
  const entries = useHistory((s) => s.entries);
  const stories = useMemo(() => entries.map((e) => e.story), [entries]);
  return (
    <View style={{ flex: 1 }}>
      <StoryList
        testID="history-list"
        stories={stories}
        emptyTitle={strings.list.nothingRead}
        emptyHint={strings.list.nothingReadHint}
      />
    </View>
  );
}
