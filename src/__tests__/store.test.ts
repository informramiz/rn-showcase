import { useBookmarks } from '@/features/bookmarks/store';
import { toSummary } from '@/shared/api';
import { HISTORY_LIMIT, useHistory } from '@/features/history/store';
import { useSettings } from '@/features/settings/store';
import { resolveScheme } from '@/shared/theme';

const s = (id: number) => ({ id, title: `Story ${id}` });

beforeEach(() => {
  useBookmarks.setState({ items: [] });
  useHistory.setState({ entries: [] });
  useSettings.setState({ themeMode: 'system' });
});

describe('bookmarks', () => {
  it('toggles and orders newest first', () => {
    useBookmarks.getState().toggle(s(1));
    useBookmarks.getState().toggle(s(2));
    expect(useBookmarks.getState().items.map((i) => i.id)).toEqual([2, 1]);
    useBookmarks.getState().toggle(s(2));
    expect(useBookmarks.getState().items.map((i) => i.id)).toEqual([1]);
  });

  it('toSummary keeps only the stored fields', () => {
    expect(toSummary({ id: 1, title: 'x', kids: [1, 2], text: 'long' })).toEqual({
      id: 1,
      title: 'x',
      url: undefined,
      by: undefined,
      time: undefined,
      score: undefined,
      descendants: undefined,
    });
  });
});

describe('history', () => {
  it('moves a re-read story to the front without duplicating', () => {
    const h = useHistory.getState();
    h.markRead(s(1), 1);
    h.markRead(s(2), 2);
    h.markRead(s(1), 3);
    expect(useHistory.getState().entries.map((e) => e.story.id)).toEqual([1, 2]);
  });

  it('caps the list', () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) useHistory.getState().markRead(s(i), i);
    expect(useHistory.getState().entries).toHaveLength(HISTORY_LIMIT);
    expect(useHistory.getState().entries[0]?.story.id).toBe(HISTORY_LIMIT + 4);
  });
});

describe('settings and theme', () => {
  it('stores the theme mode', () => {
    useSettings.getState().setThemeMode('dark');
    expect(useSettings.getState().themeMode).toBe('dark');
  });
  it('resolves system vs override', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('light', 'dark')).toBe('light');
  });
});
