import { flattenThread, htmlToText, toggleSet, type ItemState } from '../lib/comments';

const loaded = (id: number, kids?: number[], extra = {}): ItemState => ({
  status: 'loaded',
  item: { id, kids, ...extra },
});

describe('flattenThread', () => {
  const items: Record<number, ItemState> = {
    1: loaded(1, [3, 4]),
    2: loaded(2),
    3: loaded(3, [5]),
    4: loaded(4, undefined, { deleted: true }),
    5: loaded(5),
  };

  it('shows only roots when nothing is expanded', () => {
    const rows = flattenThread([1, 2], items, new Set());
    expect(rows.map((r) => [r.id, r.depth])).toEqual([
      [1, 0],
      [2, 0],
    ]);
    expect(rows[0]?.replyCount).toBe(2);
  });

  it('shows children with depth for expanded nodes and skips deleted ones', () => {
    const rows = flattenThread([1, 2], items, new Set([1, 3]));
    expect(rows.map((r) => [r.id, r.depth])).toEqual([
      [1, 0],
      [3, 1],
      [5, 2],
      [2, 0],
    ]);
  });

  it('hides a whole subtree when the parent is collapsed', () => {
    const rows = flattenThread([1], items, new Set([3]));
    expect(rows.map((r) => r.id)).toEqual([1]);
  });

  it('treats unknown ids as loading', () => {
    const rows = flattenThread([42], {}, new Set());
    expect(rows[0]?.state.status).toBe('loading');
  });
});

describe('toggleSet', () => {
  it('adds and removes without mutating', () => {
    const a = new Set([1]);
    const b = toggleSet(a, 2);
    expect([...a]).toEqual([1]);
    expect([...b]).toEqual([1, 2]);
    expect([...toggleSet(b, 1)]).toEqual([2]);
  });
});

describe('htmlToText', () => {
  it('converts paragraphs, links and entities', () => {
    const html =
      'Hi &amp; bye<p>See <a href="https://x.dev/a?b=1&amp;c=2" rel="nofollow">https://x.dev/a?b=1...</a><p>it&#x27;s <i>fine</i>';
    expect(htmlToText(html)).toBe("Hi & bye\n\nSee https://x.dev/a?b=1&c=2\n\nit's fine");
  });
  it('handles undefined', () => {
    expect(htmlToText(undefined)).toBe('');
  });
});
