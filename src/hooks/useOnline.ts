import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

/** Wire NetInfo into TanStack Query once, at the app root. */
export function useOnlineManagerSync() {
  useEffect(() => {
    onlineManager.setEventListener((setOnline) =>
      NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
    );
  }, []);
}

export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) =>
      setOnline(s.isConnected !== false && s.isInternetReachable !== false),
    );
    return unsub;
  }, []);
  return online;
}
