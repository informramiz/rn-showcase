import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { useSyncEvents } from '@/features/sync/useSyncStatus';
import { NotesSection } from '../NotesSection';
import { parseTags, useNotesViewModel } from '../useNotesViewModel';
import { clientWrapper, newTestClient, newTestServices, renderWithClient } from '../../../__tests__/helpers';

const STORY = 42;

function first<T>(list: readonly T[]): T {
  const [item] = list;
  if (item === undefined) throw new Error('expected at least one item');
  return item;
}

describe('useNotesViewModel failures', () => {
  it('keeps the draft, flags the error and ignores a second save while one is running', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const services = newTestServices();
    const save = jest.spyOn(services.repos.notes, 'save').mockRejectedValueOnce(new Error('disk full'));
    const { result } = await renderHook(() => useNotesViewModel(STORY), {
      wrapper: clientWrapper(newTestClient(), services),
    });
    await act(() => result.current.actions.setBody('keep me'));
    await act(async () => {
      await Promise.all([result.current.actions.save(), result.current.actions.save()]);
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.state.failed).toBe(true);
    expect(result.current.state.editor.body).toBe('keep me');

    await act(() => result.current.actions.save());
    expect(result.current.state.failed).toBe(false);
    expect(result.current.state.editor.body).toBe('');
    warn.mockRestore();
  });
});

describe('useNotesViewModel', () => {
  it('saves a note, syncs it and edits it in place', async () => {
    const services = newTestServices();
    const { result } = await renderHook(
      () => {
        useSyncEvents();
        return useNotesViewModel(STORY);
      },
      { wrapper: clientWrapper(newTestClient(), services) },
    );
    expect(result.current.state.canSave).toBe(false);
    await act(() => result.current.actions.save());
    expect(await services.repos.notes.listForStory(STORY)).toEqual([]);

    await act(() => {
      result.current.actions.setHighlight('a quote');
      result.current.actions.setBody('  my note ');
      result.current.actions.setTags('Rust, compilers, rust');
    });
    await act(() => result.current.actions.save());

    await waitFor(() => expect(result.current.state.notes).toHaveLength(1));
    const note = first(result.current.state.notes);
    expect(note).toMatchObject({ body: 'my note', highlight: 'a quote', tags: ['rust', 'compilers'] });
    expect(result.current.state.editor.body).toBe('');
    // The mutation kicks the engine; the fake server accepts it.
    await waitFor(() => expect(result.current.state.notes[0]?.sync).toBe('synced'));

    await act(() => result.current.actions.edit(note));
    expect(result.current.state).toMatchObject({ editing: true, editor: { tags: 'rust, compilers' } });
    await act(() => result.current.actions.setBody('changed'));
    await act(() => result.current.actions.save());
    await waitFor(() => expect(result.current.state.notes[0]?.body).toBe('changed'));
    expect(result.current.state.notes).toHaveLength(1);
  });

  it('cancels an edit and deleting the edited note clears the editor', async () => {
    const services = newTestServices();
    const note = await services.repos.notes.save({ storyId: STORY, body: 'x', tags: [] }, 1);
    const { result } = await renderHook(() => useNotesViewModel(STORY), {
      wrapper: clientWrapper(newTestClient(), services),
    });
    await waitFor(() => expect(result.current.state.notes).toHaveLength(1));
    const loaded = first(result.current.state.notes);
    await act(() => result.current.actions.edit(loaded));
    await act(() => result.current.actions.cancelEdit());
    expect(result.current.state.editing).toBe(false);

    await act(() => result.current.actions.edit(loaded));
    await act(() => result.current.actions.remove(note.id));
    expect(result.current.state.editing).toBe(false);
    await waitFor(() => expect(result.current.state.notes).toEqual([]));
  });

  it('splits tags on commas (normalised by the repository)', () => {
    expect(parseTags('a, b')).toEqual(['a', ' b']);
  });
});

describe('NotesSection', () => {
  it('adds a note and shows its tags and sync state', async () => {
    const services = newTestServices();
    services.network.setFlaky(true);
    await renderWithClient(<NotesSection storyId={STORY} />, newTestClient(), services);
    expect(screen.getByText('No notes yet.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('note-highlight-input'), 'quoted line');
    await fireEvent.changeText(screen.getByTestId('note-body-input'), 'worth reading');
    await fireEvent.changeText(screen.getByTestId('note-tags-input'), 'perf');
    await fireEvent.press(screen.getByTestId('note-save'));

    expect(await screen.findByText('worth reading')).toBeTruthy();
    expect(screen.getByText('#perf')).toBeTruthy();
    expect(screen.getByText('“quoted line”')).toBeTruthy();
    // Flaky server with random 0.5 < 0.6: the push fails and the note waits.
    expect(await screen.findByText('Waiting to sync')).toBeTruthy();

    const note = first(await services.repos.notes.listForStory(STORY));
    await fireEvent.press(screen.getByTestId(`note-edit-${note.id}`));
    expect(screen.getByText('Update note')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('note-cancel'));
    expect(screen.getByText('Add note')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(`note-delete-${note.id}`));
    expect(await screen.findByText('No notes yet.')).toBeTruthy();
  });
});
