import { setUpTests } from 'react-native-reanimated';
import type { routerMock as RouterMock } from './src/__tests__/routerMock';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual<object>('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => jest.fn()) },
  addEventListener: jest.fn(() => jest.fn()),
}));
jest.mock('expo-router', () => {
  const { routerMock } = jest.requireActual<{ routerMock: typeof RouterMock }>('./src/__tests__/routerMock');
  return {
    useRouter: () => ({ push: routerMock.push }),
    useLocalSearchParams: () => routerMock.params,
    Stack: { Screen: () => null },
  };
});
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '1.0.0' } } }));
jest.mock('@shopify/flash-list', () => ({
  FlashList: jest.requireActual<typeof import('react-native')>('react-native').FlatList,
}));

// Worklets' official Jest mock: Reanimated and Gesture Handler both run on it.
jest.mock('react-native-worklets', () => jest.requireActual<object>('react-native-worklets/src/mock'));
setUpTests();
