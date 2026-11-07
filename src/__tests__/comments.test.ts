import { htmlToText, toggleSet } from '../lib/comments';

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
