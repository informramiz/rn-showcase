import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { getAlertPermission, requestAlertPermission } from '@/shared/notifications/notifications';

const PERMISSION_KEY = ['device', 'alert-permission'] as const;

/** Notification permission flow for comment alerts. Hidden on web, where alerts are a no-op. */
export function useCommentAlerts() {
  const client = useQueryClient();
  const { data: permission } = useQuery({
    queryKey: PERMISSION_KEY,
    queryFn: getAlertPermission,
    networkMode: 'always',
    enabled: Platform.OS !== 'web',
  });
  // The user may change the permission in system settings; re-read it when the app returns to the foreground.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void client.invalidateQueries({ queryKey: PERMISSION_KEY });
    });
    return () => sub.remove();
  }, [client]);
  const request = useMutation({
    mutationFn: requestAlertPermission,
    onSuccess: (result) => client.setQueryData(PERMISSION_KEY, result),
  });

  return {
    supported: Platform.OS !== 'web',
    permission,
    enable: () => request.mutate(),
    openSystemSettings: () => void Linking.openSettings(),
  };
}
