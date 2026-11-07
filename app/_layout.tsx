import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { CACHE_MAX_AGE_MS, createQueryClient, persister } from '../src/hooks/queryClient';
import { useOnlineManagerSync } from '../src/hooks/useOnline';
import { useTheme } from '../src/theme';

export default function RootLayout() {
  const [client] = useState(createQueryClient);
  const { colors, scheme } = useTheme();
  useOnlineManagerSync();

  return (
    <PersistQueryClientProvider client={client} persistOptions={{ persister, maxAge: CACHE_MAX_AGE_MS }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="story/[id]" options={{ title: 'Story' }} />
      </Stack>
    </PersistQueryClientProvider>
  );
}
