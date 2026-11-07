import { fireEvent, screen } from '@testing-library/react-native';
import { CommentThread } from '../components/CommentThread';
import { httpError, installFetch, itemIdFromUrl, mockFetch, ok, renderWithClient } from './helpers';

const items: Record<number, object> = {
  1: { id: 1, by: 'ann', text: 'root one', kids: [3, 4] },
  2: { id: 2, by: 'bob', text: 'root two' },
  3: { id: 3, by: 'cy', text: 'child three' },
  4: { id: 4, deleted: true },
};
const fetchedIds = () => mockFetch.mock.calls.map(([url]) => itemIdFromUrl(url));

beforeEach(installFetch);

describe('CommentThread', () => {
  it('loads top-level comments, and replies only when a comment is expanded', async () => {
    mockFetch.mockImplementation((url) => ok(items[itemIdFromUrl(url)]));
    await renderWithClient(<CommentThread rootIds={[1, 2]} />);
    expect(await screen.findByText('root one')).toBeTruthy();
    expect(await screen.findByText('root two')).toBeTruthy();
    expect(screen.getByText('2 replies, tap to expand')).toBeTruthy();
    expect(fetchedIds().sort()).toEqual([1, 2]);

    await fireEvent.press(screen.getByText('root one'));
    expect(await screen.findByText('child three')).toBeTruthy();
    expect(fetchedIds().sort()).toEqual([1, 2, 3, 4]);
    expect(screen.getByText('Tap to collapse')).toBeTruthy();

    await fireEvent.press(screen.getByText('root one'));
    expect(screen.queryByText('child three')).toBeNull();
    expect(screen.getByText('2 replies, tap to expand')).toBeTruthy();
  });

  it('retries a comment that failed to load', async () => {
    mockFetch.mockReturnValue(httpError(500));
    await renderWithClient(<CommentThread rootIds={[2]} />);
    const retry = await screen.findByRole('button', { name: 'Failed to load. Tap to retry.' });
    mockFetch.mockImplementation((url) => ok(items[itemIdFromUrl(url)]));
    await fireEvent.press(retry);
    expect(await screen.findByText('root two')).toBeTruthy();
  });
});
