// Register background location task before any navigation renders
import '@/tasks/locationTask';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useAuthStore } from '@/stores/authStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { queryClient } from '@/lib/queryClient';
import { useEmissionRealtime } from '@/hooks/useEmissionRealtime';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { useCreateEntry } from '@/hooks/useEmissionEntries';
import { TripsProvider } from '@/contexts/TripsContext';
import { VOfflineBanner } from '@/components/ui';
import { useNotifications } from '@/hooks/useNotifications';

SplashScreen.preventAutoHideAsync();

// Inner component — must live inside QueryClientProvider so useQueryClient() works
function AppNavigator() {
  const { session, user } = useAuthStore();
  const { onboardingComplete } = useOnboardingStore();
  const router = useRouter();
  const { hasShareIntent } = useShareIntentContext();
  useEmissionRealtime(user?.id);
  useNotifications(user?.id);
  const { mutateAsync } = useCreateEntry();
  useOfflineQueue(mutateAsync);
  // PLSH-04: Font loading occurs in child layouts (parallel with auth init) — no blocking sequential await

  // Sprint E Stage R3: a share-intent arriving while the app is already
  // running (or one queued from a cold launch) navigates straight to the
  // import screen's preview+confirm step — only once signed in, since the
  // share is meaningless before auth resolves.
  useEffect(() => {
    if (hasShareIntent && session) {
      router.push('/import');
    }
  }, [hasShareIntent, session]);

  return (
    <TripsProvider userId={user?.id}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!onboardingComplete}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="carbon-calculator" />
          <Stack.Screen name="recap" options={{ presentation: 'modal' }} />
          <Stack.Screen name="link-bank" options={{ presentation: 'modal' }} />
          <Stack.Screen name="import" options={{ presentation: 'modal' }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </TripsProvider>
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
      <ShareIntentProvider options={{ resetOnBackground: true }}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <VOfflineBanner />
          <AppNavigator />
        </QueryClientProvider>
      </ShareIntentProvider>
    </GestureHandlerRootView>
  );
}
