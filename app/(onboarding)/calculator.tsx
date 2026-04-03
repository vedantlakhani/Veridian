import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { useAuthStore } from '@/stores/authStore';
import { useBaseline } from '@/hooks/useBaseline';
import { colors, spacing, typography, radii } from '@/lib/theme';

// ─── Animated TextInput component for CO₂ counter ────────────────────────────

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Constants ────────────────────────────────────────────────────────────────

const GLOBAL_AVG_KG = 4700;   // 4.7 tCO₂e/year
const PARIS_TARGET_KG = 2500; // 2.5 tCO₂e/year

// Selected card background (light primary tint — theme has no primaryContainer token)
const PRIMARY_CONTAINER = '#E8F5EE';

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
  icon: string;
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
      { id: 'walk_cycle', label: 'Walk / Cycle', icon: '🚴', hint: '~0 kg/yr' },
      { id: 'transit', label: 'Public Transit', icon: '🚌', hint: '~500 kg/yr' },
      { id: 'petrol_car', label: 'Petrol / Diesel Car', icon: '🚗', hint: '~2,500 kg/yr' },
      { id: 'electric_car', label: 'Electric Car', icon: '⚡', hint: '~800 kg/yr' },
      { id: 'flights', label: 'Frequent Flights', icon: '✈️', hint: '~3,500 kg/yr' },
    ],
  },
  {
    id: 'transport_km',
    category: 'Transport',
    question: 'Roughly how far do you travel each week?',
    options: [
      { id: 'under_50', label: 'Under 50 km', icon: '📍', hint: 'Short distances' },
      { id: 'km_50_200', label: '50–200 km', icon: '🗺️', hint: 'Average commuter' },
      { id: 'km_200_500', label: '200–500 km', icon: '🛣️', hint: 'Long commuter' },
      { id: 'over_500', label: 'Over 500 km', icon: '🌍', hint: 'Very high mileage' },
    ],
  },
  {
    id: 'diet',
    category: 'Food',
    question: "What's your diet?",
    options: [
      { id: 'vegan', label: 'Vegan', icon: '🌱', hint: '~900 kg/yr' },
      { id: 'vegetarian', label: 'Vegetarian', icon: '🥕', hint: '~1,200 kg/yr' },
      { id: 'flexitarian', label: 'Flexitarian', icon: '🥗', hint: '~1,700 kg/yr' },
      { id: 'omnivore', label: 'Omnivore', icon: '🍖', hint: '~2,200 kg/yr' },
      { id: 'meat_daily', label: 'Meat Every Meal', icon: '🥩', hint: '~3,300 kg/yr' },
    ],
  },
  {
    id: 'meat_freq',
    category: 'Food',
    question: 'How often do you eat beef or lamb?',
    options: [
      { id: 'never', label: 'Never', icon: '🚫', hint: 'No adjustment' },
      { id: 'weekly', label: 'Once a week', icon: '📅', hint: '+20%' },
      { id: 'few_per_week', label: 'A few times a week', icon: '🍽️', hint: '+50%' },
      { id: 'daily', label: 'Daily', icon: '🔥', hint: '+100%' },
    ],
  },
  {
    id: 'home_energy',
    category: 'Home',
    question: 'What heats your home?',
    options: [
      { id: 'heat_pump', label: 'Heat Pump / Solar', icon: '☀️', hint: '~400 kg/yr' },
      { id: 'gas', label: 'Gas Central Heating', icon: '🔥', hint: '~2,400 kg/yr' },
      { id: 'oil', label: 'Oil / Coal', icon: '⛽', hint: '~3,500 kg/yr' },
      { id: 'electric_storage', label: 'Electric Storage Heaters', icon: '💡', hint: '~1,800 kg/yr' },
    ],
  },
  {
    id: 'home_size',
    category: 'Home',
    question: 'How big is your home?',
    options: [
      { id: 'small', label: 'Studio / 1-bed', icon: '🏠', hint: '×0.7' },
      { id: 'medium', label: '2–3 bed', icon: '🏡', hint: '×1.0' },
      { id: 'large', label: '4+ bed', icon: '🏘️', hint: '×1.5' },
    ],
  },
  {
    id: 'shopping_clothes',
    category: 'Shopping',
    question: 'How often do you buy new clothes?',
    options: [
      { id: 'secondhand', label: 'Mostly second-hand', icon: '♻️', hint: '~100 kg/yr' },
      { id: 'seasonal', label: 'A few items per season', icon: '🛍️', hint: '~300 kg/yr' },
      { id: 'regular', label: 'Regular shopping trips', icon: '🛒', hint: '~600 kg/yr' },
      { id: 'frequent', label: 'Frequent buyer', icon: '📦', hint: '~1,000 kg/yr' },
    ],
  },
  {
    id: 'shopping_electronics',
    category: 'Shopping',
    question: 'How often do you buy new electronics or appliances?',
    options: [
      { id: 'rarely', label: 'Rarely — every few years', icon: '🖥️', hint: '~150 kg/yr' },
      { id: 'occasional', label: 'Occasionally', icon: '📱', hint: '~400 kg/yr' },
      { id: 'frequently', label: 'Frequently — often upgrading', icon: '🔄', hint: '~800 kg/yr' },
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
              <Text style={cardStyles.optionIcon}>{option.icon}</Text>
              <View style={cardStyles.optionTextBlock}>
                <Text style={[cardStyles.optionLabel, isSelected && cardStyles.optionLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={cardStyles.optionHint}>{option.hint}</Text>
              </View>
              {isSelected && (
                <Text style={cardStyles.checkmark}>✓</Text>
              )}
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
  },
  optionIcon: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
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
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
});

// ─── FooterCounter ────────────────────────────────────────────────────────────

interface FooterCounterProps {
  co2Value: ReturnType<typeof useSharedValue<number>>;
}

function FooterCounter({ co2Value }: FooterCounterProps) {
  const animatedProps = useAnimatedProps(() => ({
    value: `${co2Value.value.toFixed(0)} kg CO\u2082e / year`,
  }));

  return (
    <View style={footerStyles.container}>
      <Text style={footerStyles.label}>Your estimated footprint</Text>
      <AnimatedTextInput
        animatedProps={animatedProps}
        editable={false}
        style={footerStyles.counter}
        // minWidth prevents iOS ellipsis clipping bug #6752
      />
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
    minWidth: 200,
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
        <Text style={resultsStyles.metricUnit}>CO\u2082e per year</Text>
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
        {[
          { label: 'Transport', icon: '🚗', kg: transportKg },
          { label: 'Food', icon: '🍽️', kg: foodKg },
          { label: 'Home', icon: '🏠', kg: homeKg },
          { label: 'Shopping', icon: '🛍️', kg: shoppingKg },
        ].map(({ label, icon, kg }) => (
          <View key={label} style={resultsStyles.breakdownRow}>
            <Text style={resultsStyles.breakdownIcon}>{icon}</Text>
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
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.lg,
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
  breakdownIcon: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
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

  const co2Value = useSharedValue(0);
  const slideX = useSharedValue(0);

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
  }));

  // Called on JS thread via runOnJS after slide-out animation completes
  const advanceStep = (optionId: string) => {
    const newAnswers = { ...answers, [QUESTIONS[step].id]: optionId };
    setAnswers(newAnswers);
    const newTotal = calcFootprint(newAnswers);

    // Slide in from right
    slideX.value = SCREEN_WIDTH;
    slideX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.ease) });

    // Animate the CO₂ counter to new total
    co2Value.value = withTiming(newTotal, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });

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
      {/* Progress header */}
      <View style={styles.header}>
        <Text style={styles.categoryLabel}>{getCategoryProgress(step)}</Text>
        <ProgressDots step={step} total={QUESTIONS.length} />
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
      <FooterCounter co2Value={co2Value} />
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
  categoryLabel: {
    fontFamily: typography.fontFamilyDefault,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
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
