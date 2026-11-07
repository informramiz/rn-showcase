import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HNItem, StorySummary } from '../api';
import { strings } from '../i18n/strings';
import { zustandStorage } from '../lib/storage';

export function toSummary(item: HNItem): StorySummary {
  return {
    id: item.id,
    title: item.title ?? strings.story.untitled,
    url: item.url,
    by: item.by,
    time: item.time,
    score: item.score,
    descendants: item.descendants,
  };
}

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
