import { useRef, useState } from 'react';
import type { NoteWithSync } from '@/shared/sync/types';
import { useDeleteNote, useNotes, useSaveNote } from './useNotes';

interface Editor {
  id?: string;
  body: string;
  highlight: string;
  tags: string;
}

const EMPTY: Editor = { body: '', highlight: '', tags: '' };

export const parseTags = (text: string): string[] => text.split(',');

/** Notes and highlights on one saved story, with an inline editor. */
export function useNotesViewModel(storyId: number) {
  const { data: notes = [] } = useNotes(storyId);
  const saveNote = useSaveNote();
  const deleteNote = useDeleteNote();
  const [editor, setEditor] = useState<Editor>(EMPTY);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [failed, setFailed] = useState(false);

  /** Run one write at a time; on failure keep the draft and flag the error. */
  const guarded = async (write: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setFailed(false);
    try {
      await write();
    } catch (e) {
      console.warn('Note write failed', e);
      setFailed(true);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const save = () =>
    guarded(async () => {
      if (!editor.body.trim()) return;
      await saveNote({
        id: editor.id,
        storyId,
        body: editor.body,
        highlight: editor.highlight,
        tags: parseTags(editor.tags),
      });
      setEditor(EMPTY);
    });

  return {
    state: {
      notes,
      editor,
      editing: editor.id !== undefined,
      canSave: editor.body.trim().length > 0 && !busy,
      busy,
      failed,
    },
    actions: {
      setBody: (body: string) => setEditor((e) => ({ ...e, body })),
      setHighlight: (highlight: string) => setEditor((e) => ({ ...e, highlight })),
      setTags: (tags: string) => setEditor((e) => ({ ...e, tags })),
      save,
      edit: (note: NoteWithSync) =>
        setEditor({
          id: note.id,
          body: note.body,
          highlight: note.highlight ?? '',
          tags: note.tags.join(', '),
        }),
      cancelEdit: () => setEditor(EMPTY),
      remove: (id: string) =>
        guarded(async () => {
          await deleteNote(id);
          setEditor((e) => (e.id === id ? EMPTY : e));
        }),
    },
  };
}
