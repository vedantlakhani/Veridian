import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  FadeIn,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { useBaseline } from '@/hooks/useBaseline';
import { VCountUp } from '@/components/ui';
import { Illustration, type IllustrationName } from '@/components/illustrations';
import { globalAverageComparisonCaption } from '@/lib/impactCopy';
import { colors, spacing, typography, radii, shadows } from '@/lib/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Full-bleed category photography behind the question card — same licensed
// hero-*.jpg set used in (onboarding)/index.tsx (assets/images/PHOTO_CREDITS.md).
const CATEGORY_HERO_IMAGES: Record<string, number> = {
  Transport: require('@/assets/images/hero-transport.jpg'),
  Food: require('@/assets/images/hero-food.jpg'),
  Home: require('@/assets/images/hero-home.jpg'),
  Shopping: require('@/assets/images/hero-shopping.jpg'),
};

function CategoryHero({ category }: { category: string }) {
  const image = CATEGORY_HERO_IMAGES[category] ?? CATEGORY_HERO_IMAGES.Transport;
  return (
    <Animated.View
      key={category}
      entering={FadeIn.duration(400)}
      style={heroStyles.wrap}
      pointerEvents="none"
    >
      <Image source={image} style={heroStyles.image} resizeMode="cover" />
      <View style={heroStyles.wash} />
      <LinearGradient
        colors={['rgba(13,17,23,0.35)', 'transparent', 'rgba(13,17,23,0.15)', colors.background]}
        locations={[0, 0.22, 0.55, 1]}
        style={heroStyles.scrim}
      />
    </Animated.View>
  );
}

const heroStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '38%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  // Pending real re-shoots for a light ground (DESIGN_DIRECTION.md open
  // question), a low-opacity white wash lifts these dark-graded photos.
  wash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
});

// ─── Constants ────────────────────────────────────────────────────────────────

const GLOBAL_AVG_KG = 4700;   // 4.7 tCO₂e/year
const PARIS_TARGET_KG = 2500; // 2.5 tCO₂e/year

// Selected card background — soft evergreen tint on the light canvas
const PRIMARY_CONTAINER = colors.primaryGlowSoft;

// ─── Question data ────────────────────────────────────────────────────────────

const TRANSPORT_BASE: Record<string, number> = {
  walk_cycle: 0,
  transit: 500,
  petrol_car: 2500,
  electric_car: 800,
  flights: 3500,
};

const DISTANCE_MULT: Record<string, number> = {
  under_50: 0.5,
  km_50_200: 1.0,
  km_200_500: 1.8,
  over_500: 3.0,
};

const DIET_BASE: Record<string, number> = {
  vegan: 900,
  vegetarian: 1200,
  flexitarian: 1700,
  omnivore: 2200,
  meat_daily: 3300,
};

const MEAT_MULT: Record<string, number> = {
  never: 1.0,
  weekly: 1.2,
  few_per_week: 1.5,
  daily: 2.0,
};

const HOME_ENERGY_BASE: Record<string, number> = {
  heat_pump: 400,
  gas: 2400,
  oil: 3500,
  electric_storage: 1800,
};

const HOME_SIZE_MULT: Record<string, number> = {
  small: 0.7,
  medium: 1.0,
  large: 1.5,
};

const CLOTHES_KG: Record<string, number> = {
  secondhand: 100,
  seasonal: 300,
  regular: 600,
  frequent: 1000,
};

const ELECTRONICS_KG: Record<string, number> = {
  rarely: 150,
  occasional: 400,
  frequently: 800,
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnswerKey =
  | 'transport'
  | 'transport_km'
  | 'diet'
  | 'meat_freq'
  | 'home_energy'
  | 'home_size'
  | 'shopping_clothes'
  | 'shopping_electronics';

// ─── calcFootprint — exported pure function ───────────────────────────────────

export function calcFootprint(answers: Partial<Record<AnswerKey, string>>): number {
  const transportBase = TRANSPORT_BASE[answers.transport ?? ''] ?? 500;
  const distanceMult = DISTANCE_MULT[answers.transport_km ?? ''] ?? 1.0;
  const transport = transportBase * distanceMult;

  const dietBase = DIET_BASE[answers.diet ?? ''] ?? 2200;
  const meatMult = MEAT_MULT[answers.meat_freq ?? ''] ?? 1.0;
  const food = dietBase * meatMult;

  const homeBase = HOME_ENERGY_BASE[answers.home_energy ?? ''] ?? 2400;
  const homeMult = HOME_SIZE_MULT[answers.home_size ?? ''] ?? 1.0;
  const home = homeBase * homeMult;

  const clothes = CLOTHES_KG[answers.shopping_clothes ?? ''] ?? 300;
  const electronics = ELECTRONICS_KG[answers.shopping_electronics ?? ''] ?? 400;

  return transport + food + home + clothes + electronics;
}

// ─── Question definitions ─────────────────────────────────────────────────────

interface QuestionOption {
  id: string;
  label: string;
  /** Line-illustration name (components/illustrations); omitted for pure
   * frequency/size gradations that have no matching object glyph — no emoji,
   * ever (DESIGN_DIRECTION.md — "What Clearing is NOT"). */
  icon?: IllustrationName;
  hint: string;
}

interface Question {
  id: AnswerKey;
  category: string;
  question: string;
  options: QuestionOption[];
}

const QUESTIONS: Question[] = [
  {
    id: 'transport',
    category: 'Transport',
    question: 'How do you usually travel?',
    options: [
      { id: 'walk_cycle', label: 'Walk / Cycle', icon: 'transport.bike', hint: '~0 kg/yr' },
      { id: 'transit', label: 'Public Transit', icon: 'transport.transit', hint: '~500 kg/yr' },
      { id: 'petrol_car', label: 'Petrol / Diesel Car', icon: 'transport.car', hint: '~2,500 kg/yr' },
      { id: 'electric_car', label: 'Electric Car', icon: 'transport.car', hint: '~800 kg/yr' },
      { id: 'flights', label: 'Frequent Flights', hint: '~3,500 kg/yr' },
    ],
  },
  {
    id: 'transport_km',
    category: 'Transport',
    question: 'Roughly how far do you travel each week?',
    options: [
      { id: 'under_50', label: 'Under 50 km', hint: 'Short distances' },
      { id: 'km_50_200', label: '50–200 km', hint: 'Average commuter' },
      { id: 'km_200_500', label: '200–500 km', hint: 'Long commuter' },
      { id: 'over_500', label: 'Over 500 km', hint: 'Very high mileage' },
    ],
  },
  {
    id: 'diet',
    category: 'Food',
    question: "What's your diet?",
    options: [
      { id: 'vegan', label: 'Vegan', icon: 'food.vegan', hint: '~900 kg/yr' },
      { id: 'vegetarian', label: 'Vegetarian', icon: 'food.vegetarian', hint: '~1,200 kg/yr' },
      { id: 'flexitarian', label: 'Flexitarian', icon: 'food.flexitarian', hint: '~1,700 kg/yr' },
      { id: 'omnivore', label: 'Omnivore', icon: 'food.omnivore', hint: '~2,200 kg/yr' },
      { id: 'meat_daily', label: 'Meat Every Meal', icon: 'food.omnivore', hint: '~3,300 kg/yr' },
    ],
  },
  {
    id: 'meat_freq',
    category: 'Food',
    question: 'How often do you eat beef or lamb?',
    options: [
      { id: 'never', label: 'Never', hint: 'No adjustment' },
      { id: 'weekly', label: 'Once a week', hint: '+20%' },
      { id: 'few_per_week', label: 'A few times a week', hint: '+50%' },
      { id: 'daily', label: 'Daily', hint: '+100%' },
    ],
  },
  {
    id: 'home_energy',
    category: 'Home',
    question: 'What heats your home?',
    options: [
      { id: 'heat_pump', label: 'Heat Pump / Solar', icon: 'energy.solar', hint: '~400 kg/yr' },
      { id: 'gas', label: 'Gas Central Heating', icon: 'energy.gas', hint: '~2,400 kg/yr' },
      { id: 'oil', label: 'Oil / Coal', icon: 'energy.gas', hint: '~3,500 kg/yr' },
      { id: 'electric_storage', label: 'Electric Storage Heaters', icon: 'energy.grid', hint: '~1,800 kg/yr' },
    ],
  },
  {
    id: 'home_size',
    category: 'Home',
    question: 'How big is your home?',
    options: [
      { id: 'small', label: 'Studio / 1-bed', hint: '×0.7' },
      { id: 'medium', label: '2–3 bed', hint: '×1.0' },
      { id: 'large', label: '4+ bed', hint: '×1.5' },
    ],
  },
  {
    id: 'shopping_clothes',
    category: 'Shopping',
    question: 'How often do you buy new clothes?',
    options: [
      { id: 'secondhand', label: 'Mostly second-hand', icon: 'shopping.minimal', hint: '~100 kg/yr' },
      { id: 'seasonal', label: 'A few items per season', icon: 'shopping.minimal', hint: '~300 kg/yr' },
      { id: 'regular', label: 'Regular shopping trips', icon: 'shopping.moderate', hint: '~600 kg/yr' },
      { id: 'frequent', label: 'Frequent buyer', icon: 'shopping.heavy', hint: '~1,000 kg/yr' },
    ],
  },
  {
    id: 'shopping_electronics',
    category: 'Shopping',
    question: 'How often do you buy new electronics or appliances?',
    options: [
      { id: 'rarely', label: 'Rarely — every few years', icon: 'shopping.minimal', hint: '~150 kg/yr' },
      { id: 'occasional', label: 'Occasionally', icon: 'shopping.moderate', hint: '~400 kg/yr' },
      { id: 'frequently', label: 'Frequently — often upgrading', icon: 'shopping.heavy', hint: '~800 kg/yr' },
    ],
  },
];

// ─── Category step counts (for progress indicator) ───────────────────────────

function getCategoryProgress(step: number): string {
  const q = QUESTIONS[step];
  if (!q) return '';
  const categoryQuestions = QUESTIONS.filter((q2) => q2.category === q.category);
  const indexInCategory = categoryQuestions.findIndex((q2) => q2.id === q.id) + 1;
  return `${q.category} · ${indexInCategory} of ${categoryQuestions.length}`;
}

// ─── QuestionCard ─────────────────────────────────────────────────────────────

interface QuestionCardProps {
  question: Question;
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}

function QuestionCard({ question, selectedId, onSelect }: QuestionCardProps) {
  // Homogeneous per question — either every option has a matching object
  // glyph (transport mode, diet, energy source, shopping volume) or none do
  // (pure frequency/size gradations have nothing to illustrate).
  const hasIcons = question.options.some((o) => o.icon);
  return (
    <View style={cardStyles.container}>
      <Text style={cardStyles.questionText}>{question.question}</Text>
      <View style={cardStyles.optionsList}>
        {question.options.map((option) => {
          const isSelected = selectedId === option.id;
          return (
            <TouchableOpacity
              key={option.id}
              style={[cardStyles.option, isSelected && cardStyles.optionSelected]}
              onPress={() => onSelect(option.id)}
              activeOpacity={0.75}
            >
              {hasIcons && option.icon && <Illustration name={option.icon} size={40} />}
              <View style={cardStyles.optionTextBlock}>
                <Text style={[cardStyles.optionLabel, isSelected && cardStyles.optionLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={cardStyles.optionHint}>{option.hint}</Text>
              </View>
              <View style={[cardStyles.radio, isSelected && cardStyles.radioSelected]}>
                {isSelected && <View style={cardStyles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  questionText: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  optionsList: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  optionSelected: {
    backgroundColor: PRIMARY_CONTAINER,
    borderColor: colors.primary,
    ...shadows.glowPrimary,
  },
  optionTextBlock: {
    flex: 1,
  },
  optionLabel: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionHint: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 11,
    height: 11,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
  },
});

// ─── FooterCounter ────────────────────────────────────────────────────────────

interface FooterCounterProps {
  /** null until the user has answered something: calcFootprint({}) is only defaults. */
  totalKg: number | null;
}

function FooterCounter({ totalKg }: FooterCounterProps) {
  return (
    <View style={footerStyles.container}>
      <Text style={footerStyles.label}>Your estimated footprint</Text>
      {totalKg === null ? (
        <Text style={footerStyles.counter}>–</Text>
      ) : (
        <VCountUp value={totalKg} decimals={0} style={footerStyles.counter} />
      )}
      <Text style={footerStyles.unit}>
        {totalKg === null ? 'Answer a question to start' : 'kg CO₂e / year'}
      </Text>
    </View>
  );
}

const footerStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
  label: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  counter: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 32,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    minWidth: 90,
  },
  unit: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});

// ─── ResultsScreen ────────────────────────────────────────────────────────────

interface ResultsScreenProps {
  answers: Partial<Record<AnswerKey, string>>;
  totalKg: number;
}

function ResultsScreen({ answers, totalKg }: ResultsScreenProps) {
  const router = useRouter();
  const { complete, setPendingBaseline } = useOnboardingStore();
  const { user } = useAuthStore();
  const { saveBaseline } = useBaseline();

  const totalTonnes = (totalKg / 1000).toFixed(1);
  const globalAvgTonnes = (GLOBAL_AVG_KG / 1000).toFixed(1);
  const parisTargetTonnes = (PARIS_TARGET_KG / 1000).toFixed(1);

  // Category breakdowns
  const transportKg = (TRANSPORT_BASE[answers.transport ?? ''] ?? 500) *
    (DISTANCE_MULT[answers.transport_km ?? ''] ?? 1.0);
  const foodKg = (DIET_BASE[answers.diet ?? ''] ?? 2200) *
    (MEAT_MULT[answers.meat_freq ?? ''] ?? 1.0);
  const homeKg = (HOME_ENERGY_BASE[answers.home_energy ?? ''] ?? 2400) *
    (HOME_SIZE_MULT[answers.home_size ?? ''] ?? 1.0);
  const shoppingKg = (CLOTHES_KG[answers.shopping_clothes ?? ''] ?? 300) +
    (ELECTRONICS_KG[answers.shopping_electronics ?? ''] ?? 400);

  const handleCta = () => {
    if (user) {
      // Post-auth: user already signed in, save directly and go to tabs
      void saveBaseline(totalKg).then(() => {
        router.replace('/(tabs)' as any);
      });
    } else {
      // Pre-auth: stash baseline, mark onboarding done, go to signup
      void setPendingBaseline(totalKg).then(() => complete()).then(() => {
        router.push('/(auth)/signup' as any);
      });
    }
  };

  const ctaLabel = user ? 'Save my footprint' : 'Save my footprint — Sign Up';

  return (
    <ScrollView
      style={resultsStyles.scroll}
      contentContainerStyle={resultsStyles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={resultsStyles.heading}>Your Carbon Footprint</Text>

      {/* Primary metric */}
      <View style={resultsStyles.metricBlock}>
        <Text style={resultsStyles.metricValue}>{totalTonnes}t</Text>
        <Text style={resultsStyles.metricUnit}>CO₂e per year</Text>
        <Text style={resultsStyles.comparisonCaption}>
          {globalAverageComparisonCaption(parseFloat(totalTonnes), parseFloat(globalAvgTonnes))}
        </Text>
      </View>

      {/* Comparison chips */}
      <View style={resultsStyles.chipRow}>
        <View style={[resultsStyles.chip, resultsStyles.chipNeutral]}>
          <Text style={resultsStyles.chipLabel}>Global avg: {globalAvgTonnes}t</Text>
        </View>
        <View style={[resultsStyles.chip, resultsStyles.chipGreen]}>
          <Text style={[resultsStyles.chipLabel, resultsStyles.chipLabelGreen]}>
            Paris target: {parisTargetTonnes}t
          </Text>
        </View>
      </View>

      {/* Category breakdown */}
      <View style={resultsStyles.breakdown}>
        <Text style={resultsStyles.breakdownTitle}>Breakdown by category</Text>
        {(
          [
            { label: 'Transport', icon: 'transport.car' as const, kg: transportKg },
            { label: 'Food', icon: 'food.omnivore' as const, kg: foodKg },
            { label: 'Home', icon: 'energy.grid' as const, kg: homeKg },
            { label: 'Shopping', icon: 'shopping.moderate' as const, kg: shoppingKg },
          ]
        ).map(({ label, icon, kg }) => (
          <View key={label} style={resultsStyles.breakdownRow}>
            <Illustration name={icon} size={28} />
            <Text style={resultsStyles.breakdownLabel}>{label}</Text>
            <Text style={resultsStyles.breakdownKg}>
              {kg.toFixed(0)} kg
            </Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={resultsStyles.cta}
        onPress={handleCta}
        activeOpacity={0.85}
      >
        <Text style={resultsStyles.ctaText}>{ctaLabel}</Text>
      </TouchableOpacity>

      <Text style={resultsStyles.ctaHint}>
        Create a free account to track your progress and reduce your footprint.
      </Text>
    </ScrollView>
  );
}

const resultsStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  heading: {
    fontFamily: typography.fontFamilyDisplay,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    letterSpacing: typography.letterSpacing.tight,
  },
  metricBlock: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  metricValue: {
    fontFamily: typography.fontFamilyMono,
    fontSize: 56,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    lineHeight: 64,
  },
  metricUnit: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  comparisonCaption: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  chipNeutral: {
    backgroundColor: colors.divider,
    borderColor: colors.border,
  },
  chipGreen: {
    backgroundColor: PRIMARY_CONTAINER,
    borderColor: colors.primary,
  },
  chipLabel: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.textSecondary,
  },
  chipLabelGreen: {
    color: colors.primary,
  },
  breakdown: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownTitle: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    gap: spacing.sm,
  },
  breakdownLabel: {
    flex: 1,
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
  },
  breakdownKg: {
    fontFamily: typography.fontFamilyMono,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.textSecondary,
  },
  cta: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  ctaText: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: '#FFFFFF',
  },
  ctaHint: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

// ─── ProgressDots ─────────────────────────────────────────────────────────────

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <View style={progressStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            progressStyles.dot,
            i === step && progressStyles.dotActive,
            i < step && progressStyles.dotDone,
          ]}
        />
      ))}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.divider,
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.primary,
  },
  dotDone: {
    backgroundColor: colors.primaryLight,
  },
});

// ─── Main CalculatorScreen ────────────────────────────────────────────────────

type Phase = 'questions' | 'results';

export default function CalculatorScreen() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<AnswerKey, string>>>({});
  const [phase, setPhase] = useState<Phase>('questions');

  const slideX = useSharedValue(0);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  // Called on JS thread via runOnJS after slide-out animation completes
  const advanceStep = (optionId: string) => {
    const newAnswers = { ...answers, [QUESTIONS[step].id]: optionId };
    setAnswers(newAnswers);

    // Slide in from right
    slideX.value = SCREEN_WIDTH;
    slideX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });

    if (step >= QUESTIONS.length - 1) {
      setPhase('results');
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleOptionSelect = (optionId: string) => {
    // Slide current card out to the left, then advance
    slideX.value = withTiming(
      -SCREEN_WIDTH,
      { duration: 200, easing: Easing.in(Easing.ease) },
      () => {
        runOnJS(advanceStep)(optionId);
      },
    );
  };

  const currentQuestion = QUESTIONS[step];
  const selectedId = currentQuestion ? answers[currentQuestion.id] : undefined;

  if (phase === 'results') {
    return (
      <SafeAreaView style={styles.container}>
        <ResultsScreen answers={answers} totalKg={calcFootprint(answers)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <CategoryHero category={currentQuestion?.category ?? 'Transport'} />

      {/* Progress header */}
      <View style={styles.header}>
        <View style={styles.headerChip}>
          <Text style={styles.categoryLabel}>{getCategoryProgress(step)}</Text>
          <ProgressDots step={step} total={QUESTIONS.length} />
        </View>
      </View>

      {/* Question card with slide animation */}
      <Animated.View style={[styles.questionContainer, slideStyle]}>
        <ScrollView
          contentContainerStyle={styles.questionScroll}
          showsVerticalScrollIndicator={false}
        >
          {currentQuestion && (
            <QuestionCard
              question={currentQuestion}
              selectedId={selectedId}
              onSelect={handleOptionSelect}
            />
          )}
        </ScrollView>
      </Animated.View>

      {/* Animated CO₂ footer counter */}
      <FooterCounter totalKg={Object.keys(answers).length > 0 ? calcFootprint(answers) : null} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerChip: {
    backgroundColor: 'rgba(13,17,23,0.55)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryLabel: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primaryLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionContainer: {
    flex: 1,
  },
  questionScroll: {
    flexGrow: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
});
