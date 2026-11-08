import AsyncStorage from '@react-native-async-storage/async-storage';
import { openRepositories, WEB_STORE_KEY } from '@/shared/data/openRepositories.web';
import { newId } from '@/shared/lib/id';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

it('persists writes after a short delay and restores them on the next open', async () => {
  const repos = await openRepositories();
  await repos.bookmarks.toggle({ id: 1, title: 'One' }, 10);
  await repos.dismissed.dismiss(2, 10);
  jest.advanceTimersByTime(600);
  jest.useRealTimers();
  await new Promise((r) => setTimeout(r, 0));
  expect(await AsyncStorage.getItem(WEB_STORE_KEY)).toContain('One');

  const reopened = await openRepositories();
  expect((await reopened.bookmarks.list()).map((b) => b.story.title)).toEqual(['One']);
  expect(await reopened.dismissed.list()).toEqual([2]);
});

it('generates distinct sortable ids', () => {
  expect(
    newId(
      () => 1,
      () => 0,
    ),
  ).toBe('1-00000000000000');
  expect(newId()).not.toBe(newId());
});
