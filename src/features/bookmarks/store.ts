import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StorySummary } from '@/shared/api';
import { zustandStorage } from '@/shared/lib/storage';

interface BookmarksState {
  /** Most recently saved first. */
  items: StorySummary[];
  toggle: (story: StorySummary) => void;
  clear: () => void;
}

export const useBookmarks = create<BookmarksState>()(
  persist(
    (set) => ({
      items: [],
      toggle: (story) =>
        set((s) =>
          s.items.some((i) => i.id === story.id)
            ? { items: s.items.filter((i) => i.id !== story.id) }
            : { items: [story, ...s.items] },
        ),
      clear: () => set({ items: [] }),
    }),
    { name: 'bookmarks', storage: zustandStorage, partialize: (s) => ({ items: s.items }) },
  ),
);
