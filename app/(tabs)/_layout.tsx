import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors, budgetStateFor, budgetStateColors } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';
import { useDailySummary } from '@/hooks/useSummaries';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useBaseline } from '@/hooks/useBaseline';
import { VIcon, type VIconName } from '@/components/ui';
import { DAILY_CARBON_BUDGET_KG } from '@/types/emission';

// ─── Tab icon — VIcon + a small glowing dot whose color = budget state ───────
function TabIcon({
  name,
  focused,
  dotColor,
}: {
  name: VIconName;
  focused: boolean;
  dotColor: string;
}) {
  const c = focused ? colors.primaryLight : colors.textTertiary;
  return (
    <View style={tabStyles.iconWrap}>
      <VIcon name={name} size={23} color={c} strokeWidth={focused ? 2 : 1.75} />
      <View
        style={[
          tabStyles.dot,
          focused
            ? {
                backgroundColor: dotColor,
                shadowColor: dotColor,
              }
            : { backgroundColor: 'transparent' },
        ]}
      />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: 'center' },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default function TabLayout() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: profile, isLoading: profileLoading, isFetching: profileFetching } = useProfile(user?.id);
  const { data: daily } = useDailySummary(user?.id);
  const { pendingBaselineKg, clearPendingBaseline } = useOnboardingStore();
  const { saveBaseline } = useBaseline();

  // The active tab's dot color follows today's budget state — the app's mood
  const todayProgress = (daily?.total_kg_co2e ?? 0) / DAILY_CARBON_BUDGET_KG;
  const dotColor = budgetStateColors[budgetStateFor(todayProgress)].accent;

  useEffect(() => {
    // Wait for any query activity to settle before making gate decisions
    if (profileLoading || profileFetching) return;

    // A pending baseline means we just came from the calculator pre-signup.
    // Save it now that we have a user, then clear the flag. The cache patch
    // in useBaseline.onSuccess ensures the gate won't fire again afterward.
    if (pendingBaselineKg != null && user?.id) {
      void saveBaseline(pendingBaselineKg).then(() => clearPendingBaseline());
      return;
    }

    // Gate: redirect only when we have settled data confirming no baseline yet
    const needsCalculator =
      profile === null || (profile != null && profile.baseline_kg == null);
    if (needsCalculator) {
      router.replace('/carbon-calculator' as never);
    }
  }, [profile, profileLoading, profileFetching, pendingBaselineKg, user?.id]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} dotColor={dotColor} />,
        }}
      />
      <Tabs.Screen
        name="log"
        options={{
          title: 'Log',
          tabBarIcon: ({ focused }) => <TabIcon name="leaf" focused={focused} dotColor={dotColor} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ focused }) => <TabIcon name="chart" focused={focused} dotColor={dotColor} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} dotColor={dotColor} />,
        }}
      />
    </Tabs>
  );
}
