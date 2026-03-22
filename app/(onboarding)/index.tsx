import {
  View,
  Text,
  Dimensions,
  Platform,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  interpolate,
  Extrapolation,
  useAnimatedScrollHandler,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { VProgressRing } from '@/components/ui/VProgressRing';
import { VAiInsightCard } from '@/components/ui/VAiInsightCard';
import { VButton } from '@/components/ui/VButton';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { colors, spacing, typography, radii } from '@/lib/theme';
import type { AiInsight } from '@/hooks/useAiInsight';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Slide data ──────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: '1',
    title: 'Track your impact',
    subtitle: 'Log food, transport, and energy in seconds. See your true carbon footprint, day by day.',
  },
  {
    id: '2',
    title: 'AI-powered insights',
    subtitle: 'Claude analyses your emissions and gives you one specific, actionable step — every day.',
  },
  {
    id: '3',
    title: 'Challenge friends',
    subtitle: 'Create reduction challenges, climb the leaderboard, and earn achievement badges.',
  },
];

// ─── Static mock data ─────────────────────────────────────────────────────────

const MOCK_INSIGHT: AiInsight = {
  id: 'mock-1',
  user_id: 'mock-user',
  content: 'Switch to plant-based protein twice this week to save ~2.4 kg CO₂e',
  suggestion: 'Try lentils or chickpeas instead of beef',
  generated_at: new Date().toISOString(),
  expires_at: new Date().toISOString(),
};

const MOCK_LEADERBOARD = [
  { name: 'Alex K.', kg: 12.4, rank: 1 },
  { name: 'Maria S.', kg: 15.1, rank: 2 },
];

// ─── Dot indicator ────────────────────────────────────────────────────────────

function DotIndicator({ index, scrollX }: { index: number; scrollX: ReturnType<typeof useSharedValue<number>> }) {
  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollX.value,
      [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    ),
    width: interpolate(
      scrollX.value,
      [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH],
      [8, 24, 8],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        dotStyle,
      ]}
    />
  );
}

// ─── Slide screens ────────────────────────────────────────────────────────────

function SlideOne() {
  return (
    <View style={styles.slideContent}>
      <VProgressRing progress={0.65} size={120} color={colors.primary} />
      <Text style={styles.slideTitle}>{SLIDES[0].title}</Text>
      <Text style={styles.slideSubtitle}>{SLIDES[0].subtitle}</Text>
    </View>
  );
}

function SlideTwo() {
  return (
    <View style={styles.slideContent}>
      <VAiInsightCard
        insight={MOCK_INSIGHT}
        isLoading={false}
        error={null}
      />
      <Text style={styles.slideTitle}>{SLIDES[1].title}</Text>
      <Text style={styles.slideSubtitle}>{SLIDES[1].subtitle}</Text>
    </View>
  );
}

function SlideThree({ onGetStarted }: { onGetStarted: () => void }) {
  const handleNotifications = () => {
    // TODO: 05-03 — wire up expo-notifications (installed in plan 05-03)
    // Dynamic import used so the app does not crash if the module is absent
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Notifications: any = await import(
          // @ts-ignore — expo-notifications installed in 05-03
          'expo-notifications'
        );
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Veridian Reminders',
            importance: Notifications.AndroidImportance?.HIGH,
          });
        }
        await Notifications.requestPermissionsAsync();
      } catch {
        // expo-notifications not yet installed — silently skip
      }
    })();
  };

  return (
    <View style={styles.slideContent}>
      <View style={styles.leaderboard}>
        {MOCK_LEADERBOARD.map((row) => (
          <View key={row.rank} style={styles.leaderboardRow}>
            <Text style={styles.leaderboardRank}>{row.rank}</Text>
            <Text style={styles.leaderboardName}>{row.name}</Text>
            <Text style={styles.leaderboardKg}>{row.kg} kg</Text>
          </View>
        ))}
      </View>
      <Text style={styles.slideTitle}>{SLIDES[2].title}</Text>
      <Text style={styles.slideSubtitle}>{SLIDES[2].subtitle}</Text>
      <VButton
        label="Allow notifications"
        variant="secondary"
        fullWidth
        style={styles.notifButton}
        onPress={handleNotifications}
      />
      <VButton
        label="Get Started"
        variant="primary"
        fullWidth
        onPress={onGetStarted}
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const router = useRouter();
  const { complete } = useOnboardingStore();
  const scrollX = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleSkip = () => {
    void complete().then(() => {
      router.replace('/(auth)/login');
    });
  };

  const handleGetStarted = () => {
    void complete().then(() => {
      router.replace('/(auth)/login');
    });
  };

  const renderItem = ({ index }: { item: typeof SLIDES[number]; index: number }) => {
    if (index === 0) return <View style={styles.slide}><SlideOne /></View>;
    if (index === 1) return <View style={styles.slide}><SlideTwo /></View>;
    return <View style={styles.slide}><SlideThree onGetStarted={handleGetStarted} /></View>;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button — visible on all slides */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip} hitSlop={8}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Carousel */}
      <Animated.FlatList
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        style={styles.flatList}
      />

      {/* Dot indicators */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_slide: typeof SLIDES[number], i: number) => (
          <DotIndicator key={i} index={i} scrollX={scrollX} />
        ))}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  skipText: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.md,
    color: colors.primary,
    fontWeight: typography.weights.medium,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
  },
  slideContent: {
    width: '100%',
    alignItems: 'center',
  },
  slideTitle: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  slideSubtitle: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.sizes.md * typography.lineHeights.relaxed,
    marginBottom: spacing.lg,
  },
  leaderboard: {
    width: '100%',
    marginBottom: spacing.md,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  leaderboardRank: {
    width: 24,
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  leaderboardName: {
    flex: 1,
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.sm,
    color: colors.textPrimary,
  },
  leaderboardKg: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  notifButton: {
    marginBottom: spacing.sm,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
});
