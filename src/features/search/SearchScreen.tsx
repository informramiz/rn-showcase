import { TextInput, View } from 'react-native';
import { strings } from '@/shared/i18n/strings';
import { radius, spacing, useTheme } from '@/shared/theme';
import { Chip } from '@/shared/ui/Chip';
import { EmptyState } from '@/shared/ui/ErrorState';
import { StoryList } from '@/shared/ui/StoryList';
import { useSearchViewModel } from './useSearchViewModel';

export function SearchScreen() {
  const { colors } = useTheme();
  const { state, actions } = useSearchViewModel();

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderColor: colors.border,
          padding: spacing.sm,
          gap: spacing.sm,
        }}
      >
        <TextInput
          testID="search-input"
          value={state.query}
          onChangeText={actions.setQuery}
          placeholder={strings.search.placeholder}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          returnKeyType="search"
          style={{
            color: colors.text,
            backgroundColor: colors.background,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          }}
        />
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {state.scopes.map((s) => (
            <Chip
              key={s}
              testID={`search-scope-${s}`}
              label={strings.search.scopes[s]}
              active={s === state.scope}
              onPress={() => actions.setScope(s)}
            />
          ))}
        </View>
      </View>
      {state.hasQuery ? (
        <StoryList
          testID="search-results"
          stories={state.results}
          readIds={state.readIds}
          onOpen={actions.openStory}
          emptyTitle={state.searching ? undefined : strings.search.noResults}
        />
      ) : (
        <EmptyState title={strings.search.prompt} hint={strings.search.hint} />
      )}
    </View>
  );
}
