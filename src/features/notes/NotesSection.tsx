import { Text, TextInput, View } from 'react-native';
import { strings } from '@/shared/i18n/strings';
import type { NoteSyncState } from '@/shared/sync/types';
import { radius, spacing, useTheme, type Colors } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';
import { useNotesViewModel } from './useNotesViewModel';

function syncColor(state: NoteSyncState, colors: Colors): string {
  if (state === 'failed') return colors.danger;
  return state === 'pending' ? colors.accent : colors.textMuted;
}

export function NotesSection({ storyId }: { storyId: number }) {
  const { colors } = useTheme();
  const { state, actions } = useNotesViewModel(storyId);
  const input = {
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  };

  return (
    <View
      testID="notes-section"
      style={{ padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface }}
    >
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{strings.notes.title}</Text>
      {state.notes.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>{strings.notes.empty}</Text>
      ) : null}
      {state.notes.map((note) => (
        <View
          key={note.id}
          testID={`note-${note.id}`}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.md,
            padding: spacing.md,
            gap: 4,
          }}
        >
          {note.highlight ? (
            <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>“{note.highlight}”</Text>
          ) : null}
          <Text style={{ color: colors.text }}>{note.body}</Text>
          {note.tags.length ? (
            <Text style={{ color: colors.accent, fontSize: 12 }}>
              {note.tags.map((t) => `#${t}`).join(' ')}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text
              testID={`note-sync-${note.id}`}
              style={{ color: syncColor(note.sync, colors), fontSize: 12, flex: 1 }}
            >
              {strings.notes.sync[note.sync]}
            </Text>
            <Button
              testID={`note-edit-${note.id}`}
              variant="surface"
              label={strings.notes.edit}
              onPress={() => actions.edit(note)}
            />
            <Button
              testID={`note-delete-${note.id}`}
              variant="dangerSurface"
              label={strings.notes.delete}
              onPress={() => void actions.remove(note.id)}
            />
          </View>
        </View>
      ))}
      <TextInput
        testID="note-highlight-input"
        value={state.editor.highlight}
        onChangeText={actions.setHighlight}
        placeholder={strings.notes.highlightPlaceholder}
        placeholderTextColor={colors.textMuted}
        style={input}
      />
      <TextInput
        testID="note-body-input"
        value={state.editor.body}
        onChangeText={actions.setBody}
        placeholder={strings.notes.bodyPlaceholder}
        placeholderTextColor={colors.textMuted}
        multiline
        style={[input, { minHeight: 64 }]}
      />
      <TextInput
        testID="note-tags-input"
        value={state.editor.tags}
        onChangeText={actions.setTags}
        placeholder={strings.notes.tagsPlaceholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        style={input}
      />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          testID="note-save"
          grow
          label={state.editing ? strings.notes.update : strings.notes.add}
          onPress={() => void actions.save()}
        />
        {state.editing ? (
          <Button
            testID="note-cancel"
            variant="outline"
            grow
            label={strings.notes.cancel}
            onPress={actions.cancelEdit}
          />
        ) : null}
      </View>
    </View>
  );
}
