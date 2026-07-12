import { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  useAnimatedStyle,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import {
  VBottomSheet,
  VSkeleton,
  VBadge,
  VText,
  VIcon,
  VPressable,
  VCountUp,
  VProgressBar,
  SwipeableEntryRow,
  type VIconName,
} from '@/components/ui';
import { useCreateEntry, useEmissionEntries, useDeleteEntry } from '@/hooks/useEmissionEntries';
import { useDurableCreateEntry } from '@/hooks/useDurableCreateEntry';
import { useAllEmissionFactors } from '@/hooks/useAllEmissionFactors';
import { useAuthStore } from '@/stores/authStore';
import { useTripsContext } from '@/contexts/TripsContext';
import { CAR_KG_PER_KM } from '@/lib/tripEngine';
import { getLocalDateString } from '@/lib/emissions';
import {
  colors,
  spacing,
  typography,
  radii,
  motion,
  gradients,
  shadows,
  budgetStateFor,
  budgetStateColors,
} from '@/lib/theme';
import { humanizeSubcategory } from '@/lib/format';
import { DAILY_CARBON_BUDGET_KG } from '@/types/emission';
import type { EmissionCategory, EmissionFactor, DetectedTrip, TripMode } from '@/types/emission';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

// ─── Category metadata ────────────────────────────────────────────────────────
const CATEGORY_META: Record<
  EmissionCategory,
  { label: string; color: string; glow: string; bg: string; icon: VIconName }
> = {
  food: { label: 'Food', color: colors.food, glow: colors.foodGlow, bg: colors.foodBg, icon: 'fork' },
  transport: { label: 'Transport', color: colors.transport, glow: colors.transportGlow, bg: colors.transportBg, icon: 'car' },
  energy: { label: 'Energy', color: colors.energy, glow: colors.energyGlow, bg: colors.energyBg, icon: 'bolt' },
  shopping: { label: 'Shopping', color: colors.shopping, glow: colors.shoppingGlow, bg: colors.shoppingBg, icon: 'sparkle' },
};

// Display order for category chips; the picker only shows categories that
// actually have factors (see availableCategories below), so 'shopping'
// appears automatically once Sprint D seeds spend-based factors.
const CATEGORY_ORDER: EmissionCategory[] = ['food', 'transport', 'energy', 'shopping'];

// Detected-trips card metadata per mode — bus/train/unknown fall back to the
// car treatment until Sprint B's activity fusion can distinguish them.
const TRIP_MODE_META: Record<TripMode, { icon: VIconName; verb: string }> = {
  car: { icon: 'car', verb: 'drive' },
  walk: { icon: 'walk', verb: 'walked' },
  cycling: { icon: 'bike', verb: 'cycled' },
  bus: { icon: 'car', verb: 'trip' },
  train: { icon: 'car', verb: 'trip' },
  unknown: { icon: 'car', verb: 'trip' },
};

// Context-aware quick-pick quantities per category
const QUICK_PICKS: Record<EmissionCategory, number[]> = {
  food: [0.25, 0.5, 1, 2],
  transport: [5, 10, 25, 50],
  energy: [1, 5, 10, 20],
  shopping: [1, 5, 10, 20],
};

// ─── Quick Slot model — the one-tap logging mechanic ─────────────────────────
interface QuickSlot {
  factor: EmissionFactor;
  quantity: number;
  count: number; // times logged in the window (0 = suggested default)
}

/** Heuristic default factors for brand-new users */
function pickDefaults(factors: EmissionFactor[]): { factor: EmissionFactor; quantity: number }[] {
  const out: { factor: EmissionFactor; quantity: number }[] = [];
  const coffee = factors.find((f) => /coffee/i.test(f.item));
  if (coffee) out.push({ factor: coffee, quantity: 1 });
  const car = factors.find((f) => f.category === 'transport' && f.unit === 'km' && /petrol|car/i.test(f.item));
  if (car) out.push({ factor: car, quantity: 10 });
  const electricity = factors.find((f) => f.category === 'energy' && /electric/i.test(f.item));
  if (electricity) out.push({ factor: electricity, quantity: 5 });
  const meal = factors.find((f) => f.category === 'food' && !/coffee/i.test(f.item));
  if (meal) out.push({ factor: meal, quantity: 1 });
  return out;
}

// ─── Particle burst — 12 emerald particles, springBouncy outward ─────────────
function Particle({ index, trigger }: { index: number; trigger: number }) {
  const progress = useSharedValue(0);
  const angle = (index / 12) * Math.PI * 2;
  const distance = 44 + (index % 3) * 14;

  useEffect(() => {
    if (trigger > 0) {
      progress.value = 0;
      progress.value = withTiming(1, { duration: 500, easing: motion.easeOut });
    }
  }, [trigger, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: trigger > 0 ? 1 - progress.value : 0,
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value },
      { scale: 1 - progress.value * 0.5 },
    ],
  }));

  return <Animated.View style={[particleStyles.dot, style]} pointerEvents="none" />;
}

function ParticleBurst({ trigger }: { trigger: number }) {
  return (
    <View style={particleStyles.wrap} pointerEvents="none">
      {Array.from({ length: 12 }).map((_, i) => (
        <Particle key={i} index={i} trigger={trigger} />
      ))}
    </View>
  );
}

const particleStyles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryLight,
  },
});

// ─── Quick Slot card ──────────────────────────────────────────────────────────
function QuickSlotCard({
  slot,
  onLog,
  onAdjust,
  disabled,
}: {
  slot: QuickSlot;
  onLog: (slot: QuickSlot) => void;
  onAdjust: (slot: QuickSlot) => void;
  disabled: boolean;
}) {
  const meta = CATEGORY_META[slot.factor.category as EmissionCategory];
  const stamp = useSharedValue(1);
  const kg = slot.factor.kg_co2e * slot.quantity;

  const stampStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stamp.value }],
  }));

  const handlePress = () => {
    // Spring "stamp" — press lands like a rubber stamp
    stamp.value = withSequence(
      withTiming(0.9, { duration: 90 }),
      withSpring(1, motion.springBouncy),
    );
    onLog(slot);
  };

  return (
    <Animated.View style={stampStyle}>
      <VPressable
        onPress={handlePress}
        onLongPress={() => onAdjust(slot)}
        disabled={disabled}
        haptic="medium"
        style={[slotStyles.card, { borderColor: `${meta.color}40` }]}
        accessibilityRole="button"
        accessibilityLabel={`Log ${slot.factor.item}, ${slot.quantity} ${slot.factor.unit}`}
      >
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: meta.glow }]} pointerEvents="none" />
        <VIcon name={meta.icon} size={18} color={meta.color} />
        <VText variant="body" style={slotStyles.name} numberOfLines={2}>
          {slot.factor.item}
        </VText>
        <VText variant="caption" style={slotStyles.qty}>
          {slot.quantity} {slot.factor.unit}
        </VText>
        <VText variant="mono" style={[slotStyles.kg, { color: meta.color }]}>
          {kg.toFixed(2)} kg
        </VText>
      </VPressable>
    </Animated.View>
  );
}

const slotStyles = StyleSheet.create({
  card: {
    width: 128,
    height: 124,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    padding: spacing.sm + 2,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 15,
  },
  qty: { fontSize: 10 },
  kg: { fontSize: 12 },
});

// ─── Log screen ───────────────────────────────────────────────────────────────
export default function LogScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const createEntry = useCreateEntry();
  const durableCreateEntry = useDurableCreateEntry();
  const deleteEntry = useDeleteEntry();

  const [activeCategory, setActiveCategory] = useState<EmissionCategory | null>(null);
  const [search, setSearch] = useState('');
  const [selectedFactor, setSelectedFactor] = useState<EmissionFactor | null>(null);
  const [quantity, setQuantity] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  const [burstKey, setBurstKey] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: factors = [], isLoading: factorsLoading } = useAllEmissionFactors();
  // Single pipeline mounted by TripsProvider in app/_layout.tsx
  const { needsConfirmation, confirmTrip, dismissTrip, requestPermissions, hasPermission, simulateTrip } =
    useTripsContext();

  // Only categories with seeded factors are pickable — keeps 'shopping' hidden
  // until its spend-based factors land (Sprint D) without hardcoding the list.
  const availableCategories = useMemo(
    () => CATEGORY_ORDER.filter((cat) => factors.some((f) => f.category === cat)),
    [factors],
  );

  const today = getLocalDateString();
  const { data: todayEntries = [] } = useEmissionEntries(user?.id, today, today);
  const { data: allEntries = [] } = useEmissionEntries(user?.id);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const todayTotal = todayEntries.reduce((sum, e) => sum + e.kg_co2e_total, 0);
  const budgetProgress = todayTotal / DAILY_CARBON_BUDGET_KG;
  // Same shared budget-state system the Home ring reads (lib/theme.ts) —
  // no ad hoc red-as-verdict threshold duplicated here (NORTH_STAR.md §8.4).
  const pillColor = budgetStateColors[budgetStateFor(budgetProgress)].accent;

  const todayDateLabel = useMemo(
    () => new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    [],
  );

  // ── Quick Slots — most-frequent factors, pure client memo ──
  const quickSlots = useMemo<QuickSlot[]>(() => {
    if (factors.length === 0) return [];
    const freq = new Map<string, { count: number; lastQty: number; lastAt: string }>();
    for (const e of allEntries) {
      const cur = freq.get(e.factor_id);
      if (cur) {
        cur.count += 1;
        if (e.logged_at > cur.lastAt) {
          cur.lastAt = e.logged_at;
          cur.lastQty = e.quantity;
        }
      } else {
        freq.set(e.factor_id, { count: 1, lastQty: e.quantity, lastAt: e.logged_at });
      }
    }
    const byId = new Map(factors.map((f) => [f.id, f]));
    const slots: QuickSlot[] = [...freq.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 4)
      .map(([factorId, info]) => ({
        factor: byId.get(factorId)!,
        quantity: info.lastQty,
        count: info.count,
      }))
      .filter((s) => !!s.factor);

    if (slots.length < 4) {
      const have = new Set(slots.map((s) => s.factor.id));
      for (const d of pickDefaults(factors)) {
        if (slots.length >= 4) break;
        if (have.has(d.factor.id)) continue;
        have.add(d.factor.id);
        slots.push({ factor: d.factor, quantity: d.quantity, count: 0 });
      }
    }
    return slots;
  }, [factors, allEntries]);

  // ── This-week frequency hints for factor rows ──
  const weekCounts = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const cutoff = weekAgo.toISOString();
    const map = new Map<string, number>();
    for (const e of allEntries) {
      if (e.logged_at >= cutoff) map.set(e.factor_id, (map.get(e.factor_id) ?? 0) + 1);
    }
    return map;
  }, [allEntries]);

  // ── Factors for active category, filtered by search, grouped ──
  const grouped = useMemo(() => {
    if (!activeCategory) return {};
    const q = search.trim().toLowerCase();
    const map: Record<string, EmissionFactor[]> = {};
    for (const f of factors) {
      if (f.category !== activeCategory) continue;
      if (q && !f.item.toLowerCase().includes(q) && !f.subcategory.toLowerCase().includes(q)) continue;
      if (!map[f.subcategory]) map[f.subcategory] = [];
      map[f.subcategory].push(f);
    }
    return map;
  }, [factors, activeCategory, search]);

  // ── Sheet content entrance — driven by the sheet's own open callback ──
  const contentScale = useSharedValue(0.95);
  const contentOpacity = useSharedValue(0);
  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
    opacity: contentOpacity.value,
  }));

  const handleSheetOpened = () => {
    contentScale.value = withSpring(1, motion.springGentle);
    contentOpacity.value = withTiming(1, { duration: 250 });
  };

  const openSheet = (factor: EmissionFactor, initialQty: string) => {
    setSelectedFactor(factor);
    setQuantity(initialQty);
    setLogSuccess(false);
    contentScale.value = 0.95;
    contentOpacity.value = 0;
    setSheetOpen(true);
  };

  const handleClose = () => {
    setSheetOpen(false);
    setSelectedFactor(null);
    setQuantity('');
    setLogSuccess(false);
  };

  // ── One-tap quick slot log — durable: offline/network failures enqueue
  // silently (VOfflineBanner already tells the user they're offline) and
  // still play the success haptic; a genuine server rejection stays silent,
  // matching the prior behavior for this flow. ──
  const handleQuickLog = async (slot: QuickSlot) => {
    if (!user?.id || durableCreateEntry.isPending) return;
    try {
      await durableCreateEntry.createDurable({ userId: user.id, factor: slot.factor, quantity: slot.quantity });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Genuine server rejection — no user-facing error for quick-log taps
    }
  };

  // ── The log ritual — checkmark morph, success haptic, particle burst ──
  const handleLog = () => {
    const qty = parseFloat(quantity);
    if (!user?.id || !selectedFactor || !(qty > 0) || createEntry.isPending) return;
    createEntry.mutate(
      { userId: user.id, factor: selectedFactor, quantity: qty },
      {
        onSuccess: () => {
          setLogSuccess(true);
          setBurstKey((k) => k + 1);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          closeTimer.current = setTimeout(handleClose, 750);
        },
      },
    );
  };

  const canLog = !!selectedFactor && parseFloat(quantity) > 0 && !createEntry.isPending;
  const selectedMeta = selectedFactor
    ? CATEGORY_META[selectedFactor.category as EmissionCategory]
    : null;
  const co2Kg =
    selectedFactor && parseFloat(quantity) > 0
      ? selectedFactor.kg_co2e * parseFloat(quantity)
      : 0;
  const budgetPct = Math.round((co2Kg / DAILY_CARBON_BUDGET_KG) * 100);
  const quickPicks = selectedFactor
    ? QUICK_PICKS[selectedFactor.category as EmissionCategory] ?? QUICK_PICKS.energy
    : [];

  // Best-matching transport factor for detected car trips
  const carFactor = useMemo(
    () =>
      factors.find(
        (f) =>
          f.category === 'transport' &&
          f.unit === 'km' &&
          /petrol.*medium|medium.*petrol|car.*medium|medium.*car/i.test(f.item),
      ) ?? factors.find((f) => f.category === 'transport' && f.unit === 'km'),
    [factors],
  );

  const handleConfirmTrip = async (trip: DetectedTrip) => {
    try {
      await confirmTrip(trip);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Could not confirm', 'Something went wrong confirming this trip. Try again.');
    }
  };

  const handleDismissTrip = async (trip: DetectedTrip) => {
    try {
      await dismissTrip(trip);
    } catch {
      // Best-effort — the card stays visible so the user can retry the swipe/tap.
    }
  };

  const handleEnableDetection = async () => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        'Location needed',
        'Veridian needs "Always" location access to detect trips in the background. Enable it in Settings → Veridian → Location → Always.',
        [{ text: 'OK' }],
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header — this screen is now the manual escape hatch; autopilot
          handles the common cases (NORTH_STAR.md §8.1). ── */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <VText variant="title">Add manually</VText>
          <VText variant="caption" style={styles.headerSub}>
            Most things track themselves — this is for the rest.
          </VText>
        </View>
        <View style={[styles.totalPill, { borderColor: `${pillColor}40` }]}>
          <VText variant="mono" style={[styles.totalPillText, { color: pillColor }]}>
            {todayTotal.toFixed(1)} kg today
          </VText>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Quick Slots — one tap, logged ── */}
        <VText variant="label" style={styles.quickLabel}>
          One-tap log
        </VText>
        {factorsLoading ? (
          <View style={styles.slotRow}>
            <VSkeleton width={128} height={124} borderRadius={radii.lg} />
            <VSkeleton width={128} height={124} borderRadius={radii.lg} />
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.slotRow}
            style={{ flexGrow: 0 }}
          >
            {quickSlots.map((slot) => (
              <QuickSlotCard
                key={slot.factor.id}
                slot={slot}
                onLog={handleQuickLog}
                onAdjust={(s) => openSheet(s.factor, String(s.quantity))}
                disabled={durableCreateEntry.isPending}
              />
            ))}
          </ScrollView>
        )}
        <VText variant="caption" style={styles.quickHint}>
          Tap to log at your usual amount · hold to adjust
        </VText>

        {/* ── Pending detected trips — one-tap confirm cards ── */}
        {needsConfirmation.length > 0 && (
          <View style={styles.tripsSection}>
            <VText variant="label" style={{ marginBottom: spacing.xs }}>
              Detected trips
            </VText>
            {needsConfirmation.map((trip) => {
              const meta = TRIP_MODE_META[trip.mode];
              const zeroEmission = trip.mode === 'walk' || trip.mode === 'cycling';
              const estimatedKg = trip.distance_km * (carFactor?.kg_co2e ?? CAR_KG_PER_KM);
              return (
                <View key={trip.id} style={styles.tripCard}>
                  <VIcon
                    name={meta.icon}
                    size={20}
                    color={zeroEmission ? colors.primaryLight : colors.transport}
                  />
                  <View style={{ flex: 1 }}>
                    <VText variant="body" style={styles.tripDistance}>
                      {trip.distance_km} km {meta.verb}
                    </VText>
                    <VText variant="caption" style={styles.tripSub}>
                      {trip.avg_speed_kmh ?? 0} km/h avg ·{' '}
                      {zeroEmission ? 'zero emissions' : `${estimatedKg.toFixed(2)} kg`}
                    </VText>
                  </View>
                  <VPressable
                    style={styles.tripConfirm}
                    onPress={() => void handleConfirmTrip(trip)}
                    haptic="medium"
                    accessibilityRole="button"
                    accessibilityLabel={zeroEmission ? 'Celebrate trip' : 'Confirm trip'}
                  >
                    <VIcon name="check" size={14} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.tripConfirmText}>{zeroEmission ? 'Nice!' : 'Confirm'}</Text>
                  </VPressable>
                  <VPressable
                    onPress={() => void handleDismissTrip(trip)}
                    haptic="light"
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss trip"
                  >
                    <VIcon name="close" size={16} color={colors.textTertiary} strokeWidth={2} />
                  </VPressable>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Category segmented row ── */}
        <View style={styles.categoryRow}>
          {availableCategories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const active = activeCategory === cat;
            return (
              <VPressable
                key={cat}
                onPress={() => {
                  setActiveCategory((prev) => (prev === cat ? null : cat));
                  setSearch('');
                }}
                haptic="light"
                style={[
                  styles.categoryChip,
                  active && { borderColor: meta.color, backgroundColor: meta.bg },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <VIcon name={meta.icon} size={16} color={active ? meta.color : colors.textSecondary} />
                <VText
                  variant="caption"
                  style={[styles.categoryChipText, active && { color: meta.color, fontWeight: '700' }]}
                >
                  {meta.label}
                </VText>
              </VPressable>
            );
          })}
        </View>

        {/* ── Factor list with search ── */}
        {activeCategory && (
          <>
            <View style={styles.searchRow}>
              <VIcon name="search" size={16} color={colors.textTertiary} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder={`Search ${CATEGORY_META[activeCategory].label.toLowerCase()}…`}
                placeholderTextColor={colors.textTertiary}
                autoCorrect={false}
              />
              {search.length > 0 && (
                <VPressable onPress={() => setSearch('')} hitSlop={8} haptic="light">
                  <VIcon name="close" size={14} color={colors.textTertiary} strokeWidth={2} />
                </VPressable>
              )}
            </View>

            {factorsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <VSkeleton key={i} width="100%" height={60} style={{ marginBottom: spacing.sm }} />
              ))
            ) : (
              Object.entries(grouped).map(([subcategory, items]) => {
                const { color } = CATEGORY_META[activeCategory];
                return (
                  <View key={subcategory} style={styles.group}>
                    <VText variant="label" style={[styles.groupLabel, { color }]}>
                      {humanizeSubcategory(subcategory)}
                    </VText>
                    {items.map((factor) => {
                      const count = weekCounts.get(factor.id) ?? 0;
                      return (
                        <VPressable
                          key={factor.id}
                          style={styles.factorCard}
                          onPress={() => openSheet(factor, '1')}
                          haptic="light"
                          accessibilityRole="button"
                          accessibilityLabel={factor.item}
                        >
                          <View style={[styles.accentBar, { backgroundColor: color }]} />
                          <View style={styles.factorContent}>
                            <VText variant="body" style={styles.factorItem} numberOfLines={1}>
                              {factor.item}
                            </VText>
                            <View style={styles.factorMetaRow}>
                              <VText variant="caption" style={styles.factorUnit}>
                                per {factor.unit}
                              </VText>
                              {count > 0 && (
                                <VText variant="caption" style={styles.factorFreq}>
                                  ×{count} this week
                                </VText>
                              )}
                            </View>
                          </View>
                          <VText variant="mono" style={styles.factorRate}>
                            {factor.kg_co2e.toFixed(2)} kg
                          </VText>
                        </VPressable>
                      );
                    })}
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ── Today's Log ── */}
        <View style={styles.todaySection}>
          <View style={styles.todayHeader}>
            <VText variant="heading">{"Today's Log"}</VText>
            <VText variant="caption" style={styles.todayDate}>
              {todayDateLabel}
            </VText>
          </View>
          {todayEntries.length === 0 ? (
            <View style={styles.todayEmpty}>
              <VText variant="caption" style={{ textAlign: 'center' }}>
                Nothing logged yet today — start with a quick slot above.
              </VText>
            </View>
          ) : (
            todayEntries.map((entry) => {
              const meta =
                CATEGORY_META[entry.emission_factors.category as EmissionCategory] ??
                CATEGORY_META.energy;
              return (
                <SwipeableEntryRow
                  key={entry.id}
                  accentColor={meta.color}
                  onDelete={() =>
                    deleteEntry.mutate({
                      id: entry.id,
                      userId: user?.id ?? '',
                      loggedAt: entry.logged_at,
                    })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <VText variant="body" style={styles.rowItem} numberOfLines={1}>
                      {entry.emission_factors.item}
                    </VText>
                    <VText variant="caption" style={styles.rowQty}>
                      {entry.quantity} {entry.emission_factors.unit}
                    </VText>
                  </View>
                  <VText variant="mono" style={styles.rowKg}>
                    {entry.kg_co2e_total.toFixed(2)} kg
                  </VText>
                </SwipeableEntryRow>
              );
            })
          )}
        </View>

        {/* ── Trip detection enable banner — only when permission is denied ── */}
        {(hasPermission === false || IS_EXPO_GO) && (
          <View>
            <VPressable
              style={styles.enableBanner}
              onPress={IS_EXPO_GO ? undefined : () => void handleEnableDetection()}
              haptic="light"
              disabled={IS_EXPO_GO}
            >
              <VIcon name="location" size={18} color={colors.transport} />
              <View style={{ flex: 1 }}>
                <VText variant="body" style={styles.enableTitle}>
                  Auto-detect trips
                </VText>
                <VText variant="caption" style={styles.enableSub}>
                  {IS_EXPO_GO
                    ? 'Background tracking works in your live app. In Expo Go, simulate a trip to test.'
                    : 'Let Veridian log your drives automatically'}
                </VText>
              </View>
              {!IS_EXPO_GO && (
                <VIcon name="chevron-right" size={16} color={colors.textSecondary} />
              )}
            </VPressable>
          </View>
        )}
        {/* Simulate is a dev-only pipeline test — dev builds on the Simulator
            have no real GPS/CoreMotion either, so it shows in any __DEV__ run */}
        {(IS_EXPO_GO || __DEV__) && (
          <VPressable
            style={styles.simulateBtn}
            onPress={() => void simulateTrip()}
            haptic="light"
          >
            <VText variant="caption" style={styles.simulateBtnText}>
              Simulate trip (12 km · 45 km/h)
            </VText>
          </VPressable>
        )}
      </ScrollView>

      {/* ── Log sheet ── */}
      <VBottomSheet isOpen={sheetOpen} onClose={handleClose} onOpened={handleSheetOpened}>
        <Animated.View style={contentStyle}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {selectedFactor && (
              <View style={sheet.container}>
                {/* Factor name + category badge */}
                <View style={sheet.headerRow}>
                  <VText variant="heading" style={sheet.factorName} numberOfLines={2}>
                    {selectedFactor.item}
                  </VText>
                  <VBadge
                    label={selectedFactor.category}
                    variant={selectedFactor.category as EmissionCategory}
                  />
                </View>

                {/* Giant CO₂ preview — re-animates as quantity changes */}
                <View
                  style={[sheet.preview, { borderColor: `${selectedMeta?.color ?? colors.primary}30` }]}
                >
                  <View style={sheet.previewValueRow}>
                    <VCountUp
                      value={co2Kg}
                      decimals={2}
                      duration={400}
                      style={[sheet.previewValue, { color: selectedMeta?.color ?? colors.primary }]}
                    />
                    <VText variant="caption" style={sheet.previewUnit}>
                      kg CO₂e
                    </VText>
                  </View>
                  {/* Budget context — where this entry lands in today's budget */}
                  <View style={sheet.budgetContext}>
                    <VProgressBar
                      progress={Math.min((todayTotal + co2Kg) / DAILY_CARBON_BUDGET_KG, 1)}
                      height={6}
                      gradient={
                        budgetStateColors[
                          budgetStateFor(budgetProgress + co2Kg / DAILY_CARBON_BUDGET_KG)
                        ].ring
                      }
                      animationDuration={400}
                    />
                    <VText variant="caption" style={sheet.budgetContextText}>
                      {co2Kg > 0
                        ? `This is ${budgetPct}% of today's budget`
                        : `Budget: ${DAILY_CARBON_BUDGET_KG} kg per day`}
                    </VText>
                  </View>
                </View>

                {/* Quick-pick quantities */}
                <VText variant="label" style={sheet.qtyLabel}>
                  Quantity ({selectedFactor.unit})
                </VText>
                <View style={sheet.quickRow}>
                  {quickPicks.map((v) => {
                    const selected = quantity === String(v);
                    return (
                      <VPressable
                        key={v}
                        style={[
                          sheet.quickBtn,
                          selected && { backgroundColor: selectedMeta?.color ?? colors.primary },
                        ]}
                        onPress={() => setQuantity(String(v))}
                        haptic="light"
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text style={[sheet.quickBtnText, selected && { color: '#FFFFFF' }]}>
                          {v}
                        </Text>
                        <Text
                          style={[sheet.quickBtnUnit, selected && { color: 'rgba(255,255,255,0.7)' }]}
                        >
                          {selectedFactor.unit}
                        </Text>
                      </VPressable>
                    );
                  })}
                </View>

                {/* Custom input */}
                <View style={sheet.inputRow}>
                  <TextInput
                    style={sheet.input}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="decimal-pad"
                    placeholder="Custom amount"
                    placeholderTextColor={colors.textSecondary}
                    selectTextOnFocus
                  />
                  <Text style={sheet.inputUnit}>{selectedFactor.unit}</Text>
                </View>

                {/* LOG — success morphs into a checkmark + particle burst */}
                <VPressable
                  onPress={handleLog}
                  disabled={!canLog && !logSuccess}
                  haptic="medium"
                  style={[sheet.logBtnWrapper, !canLog && !logSuccess && sheet.logBtnDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Log entry"
                >
                  <LinearGradient
                    colors={gradients.primaryCTA}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={sheet.logBtn}
                  >
                    {logSuccess ? (
                      <VIcon name="check" size={26} color="#FFFFFF" strokeWidth={2.5} />
                    ) : (
                      <Text style={sheet.logBtnText}>
                        {createEntry.isPending
                          ? 'Logging…'
                          : co2Kg > 0
                            ? `Log ${co2Kg.toFixed(2)} kg`
                            : 'Log'}
                      </Text>
                    )}
                  </LinearGradient>
                  <ParticleBurst trigger={burstKey} />
                </VPressable>
              </View>
            )}
          </KeyboardAvoidingView>
        </Animated.View>
      </VBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  headerSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  totalPill: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  totalPillText: { fontSize: typography.sizes.xs },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  quickLabel: { marginBottom: spacing.sm },
  slotRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickHint: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },

  tripsSection: { marginBottom: spacing.md },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: `${colors.transport}30`,
    borderLeftWidth: 3,
    borderLeftColor: colors.transport,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: 6,
  },
  tripDistance: { fontWeight: '700', lineHeight: 18 },
  tripSub: { fontSize: 11, marginTop: 1 },
  tripConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  tripConfirmText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  categoryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 44,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  categoryChipText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.md,
    color: colors.textPrimary,
    height: '100%',
  },

  group: { marginBottom: spacing.md },
  groupLabel: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  factorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    ...shadows.card,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
  },
  factorContent: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  factorItem: {
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  factorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  factorUnit: {
    fontSize: typography.sizes.xs,
    color: colors.textTertiary,
  },
  factorFreq: {
    fontSize: typography.sizes.xs,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  factorRate: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    paddingRight: spacing.md,
  },

  todaySection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginBottom: spacing.md,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  todayDate: { fontSize: typography.sizes.sm, color: colors.textTertiary },
  todayEmpty: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowItem: { fontWeight: '600', lineHeight: 18 },
  rowQty: { fontSize: typography.sizes.xs, color: colors.textTertiary, marginTop: 2 },
  rowKg: { fontSize: typography.sizes.sm, marginLeft: spacing.sm },

  enableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.transport}30`,
  },
  enableTitle: { fontWeight: '700', lineHeight: 18 },
  enableSub: { fontSize: typography.sizes.xs, marginTop: 2 },
  simulateBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginBottom: spacing.sm,
  },
  simulateBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});

const sheet = StyleSheet.create({
  container: { paddingHorizontal: spacing.sm, paddingBottom: spacing.md },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  factorName: { flex: 1 },
  preview: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    backgroundColor: colors.surfaceElevated,
  },
  previewValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  previewValue: {
    fontSize: 48,
    lineHeight: 56,
    textAlign: 'center',
  },
  previewUnit: {
    fontSize: typography.sizes.lg,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  budgetContext: {
    width: '100%',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  budgetContextText: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
  },
  qtyLabel: { marginBottom: spacing.sm },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  quickBtnText: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickBtnUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
    marginTop: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    fontFamily: typography.fontFamilyMono,
    textAlign: 'center',
  },
  inputUnit: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  logBtnWrapper: {
    borderRadius: radii.xl,
    overflow: 'hidden',
  },
  logBtnDisabled: { opacity: 0.45 },
  logBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  logBtnText: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
