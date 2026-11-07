import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { act, render, renderHook, screen } from '@testing-library/react-native';
import { OfflineBanner } from '@/shared/ui/OfflineBanner';
import { useIsOnline, useOnlineManagerSync } from '@/shared/hooks/useOnline';

type Listener = (state: NetInfoState) => void;
let emit: Listener = () => undefined;
const unsubscribe = jest.fn();

const net = (isConnected: boolean | null, isInternetReachable: boolean | null = null) =>
  ({ isConnected, isInternetReachable }) as NetInfoState;

beforeEach(() => {
  unsubscribe.mockReset();
  jest.mocked(NetInfo.addEventListener).mockImplementation((l) => {
    emit = l;
    return unsubscribe;
  });
});

describe('useIsOnline / OfflineBanner', () => {
  it('starts online and follows connectivity changes', async () => {
    const { result } = await renderHook(() => useIsOnline());
    expect(result.current).toBe(true);
    await act(() => {
      emit(net(false));
    });
    expect(result.current).toBe(false);
    await act(() => {
      emit(net(true, true));
    });
    expect(result.current).toBe(true);
    await act(() => {
      emit(net(true, false));
    });
    expect(result.current).toBe(false);
  });

  it('unsubscribes on unmount', async () => {
    const { unmount } = await renderHook(() => useIsOnline());
    await unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('shows the banner only while offline', async () => {
    await render(<OfflineBanner />);
    expect(screen.queryByText('You are offline. Showing saved data.')).toBeNull();
    await act(() => {
      emit(net(false));
    });
    expect(screen.getByText('You are offline. Showing saved data.')).toBeTruthy();
    await act(() => {
      emit(net(true, true));
    });
    expect(screen.queryByText('You are offline. Showing saved data.')).toBeNull();
  });
});

describe('useOnlineManagerSync', () => {
  it('feeds NetInfo into the TanStack online manager', async () => {
    await renderHook(() => {
      useOnlineManagerSync();
    });
    await act(() => {
      emit(net(false));
    });
    expect(onlineManager.isOnline()).toBe(false);
    await act(() => {
      emit(net(true));
    });
    expect(onlineManager.isOnline()).toBe(true);
  });
});
