import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { queryClient } from '@/lib/queryClient';
import { useEmissionRealtime } from '@/hooks/useEmissionRealtime';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useCreateEntry } from '@/hooks/useEmissionEntries';
import { VOfflineBanner } from '@/components/ui';
// TODO: 05-03 — import useNotifications from '@/hooks/useNotifications'

SplashScreen.preventAutoHideAsync();

// Inner component — must live inside QueryClientProvider so useQueryClient() works
function AppNavigator() {
  const { session, user } = useAuthStore();
  const { onboardingComplete } = useOnboardingStore();
  useEmissionRealtime(user?.id);
  const { mutateAsync } = useCreateEntry();
  useOfflineQueue(mutateAsync);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!onboardingComplete}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const { isLoading, initialize } = useAuthStore();
  const { isChecked, initialize: initOnboarding } = useOnboardingStore();

  useEffect(() => {
    // Fire both init calls in parallel — splash stays until both resolve
    initialize();
    initOnboarding();
  }, []);

  useEffect(() => {
    if (!isLoading && isChecked) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, isChecked]);

  if (isLoading || !isChecked) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <VOfflineBanner />
        <AppNavigator />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
