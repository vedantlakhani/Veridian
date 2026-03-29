import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View } from 'react-native';
import { colors } from '@/lib/theme';
import { useAuthStore } from '@/stores/authStore';
import { useProfile } from '@/hooks/useProfile';

function HomeIcon({ focused }: { focused: boolean }) {
  const c = focused ? colors.primary : colors.textSecondary;
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ width: 0, height: 0, borderLeftWidth: 10, borderRightWidth: 10, borderBottomWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: c, marginBottom: 1 }} />
      <View style={{ width: 14, height: 10, backgroundColor: c, borderRadius: 1 }} />
    </View>
  );
}

function LeafIcon({ focused }: { focused: boolean }) {
  const c = focused ? colors.primary : colors.textSecondary;
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 16, height: 20, backgroundColor: c, borderTopLeftRadius: 2, borderTopRightRadius: 14, borderBottomLeftRadius: 14, borderBottomRightRadius: 2, transform: [{ rotate: '15deg' }] }} />
    </View>
  );
}

function ChartIcon({ focused }: { focused: boolean }) {
  const c = focused ? colors.primary : colors.textSecondary;
  return (
    <View style={{ width: 24, height: 24, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3 }}>
      <View style={{ width: 5, height: 10, backgroundColor: c, borderRadius: 2 }} />
      <View style={{ width: 5, height: 16, backgroundColor: c, borderRadius: 2 }} />
      <View style={{ width: 5, height: 8, backgroundColor: c, borderRadius: 2 }} />
    </View>
  );
}

function PersonIcon({ focused }: { focused: boolean }) {
  const c = focused ? colors.primary : colors.textSecondary;
  return (
    <View style={{ width: 24, height: 24, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View style={{ width: 9, height: 9, backgroundColor: c, borderRadius: 5, marginBottom: 2 }} />
      <View style={{ width: 16, height: 8, backgroundColor: c, borderRadius: 8, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }} />
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);

  // Per-account onboarding gate: if baseline_kg is null the user never completed
  // the carbon calculator — redirect regardless of device AsyncStorage state.
  useEffect(() => {
    if (!profileLoading && profile && profile.baseline_kg == null) {
      router.replace('/calculator' as any);
    }
  }, [profile, profileLoading]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 8,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ focused }) => <HomeIcon focused={focused} /> }}
      />
      <Tabs.Screen
        name="log"
        options={{ title: 'Log', tabBarIcon: ({ focused }) => <LeafIcon focused={focused} /> }}
      />
      <Tabs.Screen
        name="insights"
        options={{ title: 'Insights', tabBarIcon: ({ focused }) => <ChartIcon focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ focused }) => <PersonIcon focused={focused} /> }}
      />
    </Tabs>
  );
}
