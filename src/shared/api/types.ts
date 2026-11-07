export type FeedKind = 'top' | 'new' | 'best' | 'ask' | 'show';

export const FEEDS: readonly FeedKind[] = ['top', 'new', 'best', 'ask', 'show'] as const;

export interface HNItem {
  id: number;
  type?: 'story' | 'comment' | 'job' | 'poll' | 'pollopt';
  by?: string;
  time?: number;
  title?: string;
  url?: string;
  text?: string;
  score?: number;
  descendants?: number;
  kids?: number[];
  parent?: number;
  deleted?: boolean;
  dead?: boolean;
}

/** Subset of an item that is stored for bookmarks. */
export interface StorySummary {
  id: number;
  title: string;
  url?: string;
  by?: string;
  time?: number;
  score?: number;
  descendants?: number;
}
