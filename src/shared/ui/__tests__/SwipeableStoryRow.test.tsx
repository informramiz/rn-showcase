import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SwipeDirection, type SwipeableProps } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { SwipeableStoryRow, type SwipeActions } from '../SwipeableStoryRow';

// The real ReanimatedSwipeable, with its props recorded so a finished swipe can be simulated.
const mockSwipe: { props?: SwipeableProps } = {};
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const actual = jest.requireActual<typeof import('react-native-gesture-handler/ReanimatedSwipeable')>(
    'react-native-gesture-handler/ReanimatedSwipeable',
  );
  const { createElement } = jest.requireActual<typeof import('react')>('react');
  const Recorded = (props: SwipeableProps) => {
    mockSwipe.props = props;
    return createElement(actual.default, props);
  };
  return { ...actual, __esModule: true, default: Recorded };
});

const swipeOpen = (direction: SwipeDirection.LEFT | SwipeDirection.RIGHT) =>
  act(() => {
    mockSwipe.props?.onSwipeableOpen?.(direction);
  });

const story = { id: 7, title: 'Swipe me' };

const setup = (actions: SwipeActions) =>
  render(
    <GestureHandlerRootView>
      <SwipeableStoryRow story={story} actions={actions}>
        <Text>{story.title}</Text>
      </SwipeableStoryRow>
    </GestureHandlerRootView>,
  );

describe('SwipeableStoryRow', () => {
  it('runs the action for the side that was swiped open', async () => {
    const onBookmark = jest.fn();
    const onDismiss = jest.fn();
    await setup({ onBookmark, onDismiss, bookmarkLabel: () => 'Save', dismissLabel: 'Hide' });
    // Dragging the row to the right opens the left panel: bookmark.
    await swipeOpen(SwipeDirection.RIGHT);
    expect(onBookmark).toHaveBeenCalledWith(story);
    await swipeOpen(SwipeDirection.LEFT);
    expect(onDismiss).toHaveBeenCalledWith(story);
  });

  it('labels the panels behind the row', async () => {
    await setup({
      onBookmark: jest.fn(),
      onDismiss: jest.fn(),
      bookmarkLabel: () => 'Unsave',
      dismissLabel: 'Hide',
    });
    expect(screen.getByTestId('swipe-bookmark-7')).toBeTruthy();
    expect(screen.getByText('Unsave')).toBeTruthy();
    expect(screen.getByText('Hide')).toBeTruthy();
  });

  it('has no panel for a missing action', async () => {
    const onDismiss = jest.fn();
    await setup({ onDismiss, dismissLabel: 'Remove' });
    expect(screen.queryByTestId('swipe-bookmark-7')).toBeNull();
    await swipeOpen(SwipeDirection.RIGHT);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
