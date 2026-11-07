import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StorySummary } from '../api';
import { zustandStorage } from '../lib/storage';

export const HISTORY_LIMIT = 200;

export interface HistoryEntry {
  story: StorySummary;
  readAt: number;
}

interface HistoryState {
  /** Most recently read first, unique by story id, capped at HISTORY_LIMIT. */
  entries: HistoryEntry[];
  markRead: (story: StorySummary, now?: number) => void;
  clear: () => void;
}

export const useHistory = create<HistoryState>()(
  persist(
    (set) => ({
      entries: [],
      markRead: (story, now = Date.now()) =>
        set((s) => ({
          entries: [{ story, readAt: now }, ...s.entries.filter((e) => e.story.id !== story.id)].slice(
            0,
            HISTORY_LIMIT,
          ),
        })),
      clear: () => set({ entries: [] }),
    }),
    { name: 'history', storage: zustandStorage, partialize: (s) => ({ entries: s.entries }) },
  ),
);

/** Selector hook for a single story so rows only re-render when their own state changes. */
export function useIsRead(id: number): boolean {
  return useHistory((s) => s.entries.some((e) => e.story.id === id));
}
