import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { registerBackgroundRefresh } from '@/features/background/backgroundTask';
import { SyncBridge } from '@/features/sync/SyncBridge';
import { useOnlineManagerSync } from '@/shared/hooks/useOnline';
import { strings } from '@/shared/i18n/strings';
import { configureNotifications, useNotificationNavigation } from '@/shared/notifications/notifications';
import { createQueryClient } from '@/shared/query/queryClient';
import { ServicesProvider } from '@/shared/services/AppServices';
import { createAppServices } from '@/shared/services/createAppServices';
import { useBootServices } from '@/shared/services/useBootServices';
import { useTheme } from '@/shared/theme';
import { Button } from '@/shared/ui/Button';

configureNotifications();

export default function RootLayout() {
  const [client] = useState(createQueryClient);
  const boot = useBootServices(createAppServices);
  const { colors, scheme } = useTheme();
  useOnlineManagerSync();
  useNotificationNavigation();
  const ready = boot.status === 'ready';
  useEffect(() => {
    if (!ready) return;
    registerBackgroundRefresh().catch((e: unknown) => {
      console.warn('Background refresh registration failed', e);
    });
  }, [ready]);

  if (boot.status !== 'ready') {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          backgroundColor: colors.background,
        }}
      >
        {boot.status === 'loading' ? (
          <ActivityIndicator testID="boot-loading" />
        ) : (
          <>
            <Text style={{ color: colors.text }}>{strings.boot.failed}</Text>
            <Button testID="boot-retry" label={strings.error.retry} onPress={boot.retry} />
          </>
        )}
      </View>
    );
  }

  return (
    <ServicesProvider services={boot.services}>
      <QueryClientProvider client={client}>
        <SyncBridge />
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="story/[id]"
            options={{ title: strings.story.screenTitle, headerBackTitle: strings.story.backTitle }}
          />
        </Stack>
      </QueryClientProvider>
    </ServicesProvider>
  );
}
