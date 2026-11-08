import { parseStoryId } from '@/shared/lib/storyLink';

describe('parseStoryId', () => {
  it.each([
    ['42', 42],
    [['7', '8'], 7],
  ])('accepts %p', (param, id) => {
    expect(parseStoryId(param)).toBe(id);
  });

  it.each([undefined, '', '0', '-3', '1.5', '12abc', ' 12', '99999999999999999999', []])(
    'rejects %p',
    (param) => {
      expect(parseStoryId(param)).toBeUndefined();
    },
  );
});
