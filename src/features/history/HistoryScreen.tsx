import { View } from 'react-native';
import { strings } from '@/shared/i18n/strings';
import { StoryList } from '@/shared/ui/StoryList';
import { useHistoryViewModel } from './useHistoryViewModel';

export function HistoryScreen() {
  const { state, actions } = useHistoryViewModel();
  return (
    <View style={{ flex: 1 }}>
      <StoryList
        testID="history-list"
        stories={state.stories}
        readIds={state.readIds}
        onOpen={actions.openStory}
        emptyTitle={strings.list.nothingRead}
        emptyHint={strings.list.nothingReadHint}
      />
    </View>
  );
}
