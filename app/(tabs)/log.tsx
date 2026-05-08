import { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withSpring, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { VBottomSheet, VSkeleton } from '@/components/ui';
import { useCreateEntry, useEmissionEntries } from '@/hooks/useEmissionEntries';
import { useAllEmissionFactors } from '@/hooks/useAllEmissionFactors';
import { useAuthStore } from '@/stores/authStore';
import { useMotionDetection } from '@/hooks/useMotionDetection';
import { getLocalDateString } from '@/lib/emissions';
import { colors, spacing, typography, radii } from '@/lib/theme';
import type { EmissionCategory, EmissionFactor } from '@/types/emission';

type FilterTab = 'all' | EmissionCategory;

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'food', label: 'Food' },
  { key: 'transport', label: 'Transport' },
  { key: 'energy', label: 'Energy' },
];

const CATEGORY_META: Record<EmissionCategory, { color: string; icon: string }> = {
  food: { color: colors.food, icon: '🌿' },
  transport: { color: colors.transport, icon: '🚗' },
  energy: { color: colors.energy, icon: '⚡' },
};

export default function LogScreen() {
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const createEntry = useCreateEntry();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedFactor, setSelectedFactor] = useState<EmissionFactor | null>(null);
  const [quantity, setQuantity] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: factors = [], isLoading: factorsLoading } = useAllEmissionFactors();
  const { pendingTrips, dismiss, markLogged, requestPermissions, hasPermission } = useMotionDetection();

  const today = getLocalDateString();
  const { data: allEntries = [] } = useEmissionEntries(user?.id, today, today);

  const todayTotal = allEntries.reduce((sum, e) => sum + e.kg_co2e_total, 0);

  const filteredFactors = useMemo(() => {
    if (activeTab === 'all') return factors;
    return factors.filter(f => f.category === activeTab);
  }, [factors, activeTab]);

  // Group by subcategory for display
  const grouped = useMemo(() => {
    const map: Record<string, EmissionFactor[]> = {};
    for (const f of filteredFactors) {
      const key = `${f.category}::${f.subcategory}`;
      if (!map[key]) map[key] = [];
      map[key].push(f);
    }
    return map;
  }, [filteredFactors]);

  // Breathe animation for sheet content
  const breatheScale = useSharedValue(0.95);
  const breatheOpacity = useSharedValue(0);
  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheScale.value }],
    opacity: breatheOpacity.value,
  }));

  const handleFactorTap = (factor: EmissionFactor) => {
    setSelectedFactor(factor);
    setQuantity('1'); // sensible default
    breatheScale.value = 0.95;
    breatheOpacity.value = 0;
    setSheetOpen(true);
    setTimeout(() => {
      breatheScale.value = withSpring(1, { damping: 18, stiffness: 180 });
      breatheOpacity.value = withTiming(1, { duration: 250 });
    }, 80);
  };

  const handleClose = () => {
    setSheetOpen(false);
    setSelectedFactor(null);
    setQuantity('');
  };

  const handleLog = () => {
    const qty = parseFloat(quantity);
    if (!user?.id || !selectedFactor || !(qty > 0)) return;
    createEntry.mutate(
      { userId: user.id, factor: selectedFactor, quantity: qty },
      { onSuccess: handleClose }
    );
  };

  const canLog = !!selectedFactor && parseFloat(quantity) > 0 && !createEntry.isPending;
  const meta = selectedFactor ? CATEGORY_META[selectedFactor.category as EmissionCategory] : null;
  const co2Preview = selectedFactor && parseFloat(quantity) > 0
    ? (selectedFactor.kg_co2e * parseFloat(quantity)).toFixed(2)
    : null;

  // Find the best-matching transport factor for a detected car trip (km unit)
  const carFactor = useMemo(
    () => factors.find(f =>
      f.category === 'transport' &&
      f.unit === 'km' &&
      /petrol.*medium|medium.*petrol|car.*medium|medium.*car/i.test(f.item)
    ) ?? factors.find(f => f.category === 'transport' && f.unit === 'km'),
    [factors],
  );

  const handleLogTrip = async (tripId: string, distanceKm: number) => {
    if (!user?.id || !carFactor) {
      Alert.alert('Cannot log', 'Transport emission factor not found — add one in the database.');
      return;
    }
    createEntry.mutate(
      { userId: user.id, factor: carFactor, quantity: distanceKm },
      { onSuccess: () => void markLogged(tripId) },
    );
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
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Log Activity</Text>
          <Text style={styles.subheading}>What did you do today?</Text>
        </View>
        {todayTotal > 0 && (
          <View style={styles.totalPill}>
            <Text style={styles.totalPillText}>{todayTotal.toFixed(1)} kg today</Text>
          </View>
        )}
      </View>

      {/* ── Category filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsRow}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Detected trips banner ── */}
      {hasPermission === null || hasPermission === false ? (
        <TouchableOpacity style={detect.enableBanner} onPress={handleEnableDetection} activeOpacity={0.8}>
          <Text style={detect.enableIcon}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={detect.enableTitle}>Auto-detect trips</Text>
            <Text style={detect.enableSub}>Tap to let Veridian detect your transport automatically</Text>
          </View>
          <Text style={detect.enableCaret}>›</Text>
        </TouchableOpacity>
      ) : pendingTrips.length > 0 ? (
        <View style={detect.section}>
          <Text style={detect.sectionTitle}>Trips detected today</Text>
          {pendingTrips.map(trip => {
            const estimatedKg = (trip.distanceKm * trip.kgPerKm).toFixed(2);
            return (
              <View key={trip.id} style={detect.tripCard}>
                <View style={detect.tripLeft}>
                  <Text style={detect.tripIcon}>🚗</Text>
                  <View>
                    <Text style={detect.tripDistance}>{trip.distanceKm} km</Text>
                    <Text style={detect.tripSub}>{trip.avgSpeedKmh} km/h avg · petrol car</Text>
                  </View>
                </View>
                <Text style={detect.tripKg}>{estimatedKg} kg</Text>
                <TouchableOpacity
                  style={detect.logBtn}
                  onPress={() => void handleLogTrip(trip.id, trip.distanceKm)}
                  activeOpacity={0.8}
                >
                  <Text style={detect.logBtnText}>Log it</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void dismiss(trip.id)} activeOpacity={0.7}>
                  <Text style={detect.dismissText}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* ── Activity cards ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {factorsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <VSkeleton key={i} width="100%" height={68} style={{ marginBottom: spacing.sm }} />
          ))
        ) : (
          Object.entries(grouped).map(([key, items]) => {
            const [categoryRaw, subcategory] = key.split('::');
            const category = categoryRaw as EmissionCategory;
            const { color, icon } = CATEGORY_META[category] ?? { color: colors.primary, icon: '•' };
            return (
              <View key={key} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupIcon}>{icon}</Text>
                  <Text style={[styles.groupLabel, { color }]}>{subcategory}</Text>
                </View>
                {items.map(factor => (
                  <TouchableOpacity
                    key={factor.id}
                    style={styles.factorCard}
                    onPress={() => handleFactorTap(factor)}
                    activeOpacity={0.7}
                  >
                    {/* Category color accent bar */}
                    <View style={[styles.accentBar, { backgroundColor: color }]} />
                    <View style={styles.factorContent}>
                      <Text style={styles.factorItem}>{factor.item}</Text>
                      <Text style={styles.factorUnit}>per {factor.unit}</Text>
                    </View>
                    <Text style={[styles.factorCo2, { color }]}>
                      {factor.kg_co2e < 1
                        ? `${(factor.kg_co2e * 1000).toFixed(0)}g`
                        : `${factor.kg_co2e.toFixed(2)}kg`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}

        {/* ── Today's logged entries ── */}
        {allEntries.length > 0 && (
          <View style={styles.todaySection}>
            <View style={styles.todayHeader}>
              <Text style={styles.todayTitle}>Logged today</Text>
              <Text style={styles.todayTotal}>{todayTotal.toFixed(1)} kg CO₂e</Text>
            </View>
            {allEntries.map(entry => {
              const c = CATEGORY_META[entry.emission_factors.category as EmissionCategory];
              return (
                <View key={entry.id} style={styles.loggedRow}>
                  <View style={[styles.loggedDot, { backgroundColor: c?.color ?? colors.primary }]} />
                  <Text style={styles.loggedItem} numberOfLines={1}>{entry.emission_factors.item}</Text>
                  <Text style={styles.loggedValue}>{entry.kg_co2e_total.toFixed(2)} kg</Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Quick-log bottom sheet ── */}
      <VBottomSheet
        isOpen={sheetOpen}
        onClose={handleClose}
        title={selectedFactor?.item ?? ''}
      >
        <Animated.View style={breatheStyle}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            {selectedFactor && (
              <View style={sheet.container}>
                {/* CO2 preview */}
                <View style={[sheet.preview, { borderColor: `${meta?.color ?? colors.primary}30` }]}>
                  <Text style={sheet.previewLabel}>CO₂ estimate</Text>
                  <Text style={[sheet.previewValue, { color: meta?.color ?? colors.primary }]}>
                    {co2Preview ? `${co2Preview} kg` : '—'}
                  </Text>
                  <Text style={sheet.previewSub}>
                    {selectedFactor.kg_co2e} kg per {selectedFactor.unit}
                  </Text>
                </View>

                {/* Quantity input */}
                <Text style={sheet.qtyLabel}>Quantity ({selectedFactor.unit})</Text>

                {/* Quick-pick buttons */}
                <View style={sheet.quickRow}>
                  {['0.5', '1', '2', '5'].map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[sheet.quickBtn, quantity === v && { backgroundColor: meta?.color ?? colors.primary }]}
                      onPress={() => setQuantity(v)}
                    >
                      <Text style={[sheet.quickBtnText, quantity === v && { color: '#fff' }]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={sheet.input}
                  value={quantity}
                  onChangeText={setQuantity}
                  keyboardType="decimal-pad"
                  placeholder="Custom amount"
                  placeholderTextColor={colors.textSecondary}
                  selectTextOnFocus
                />

                <TouchableOpacity
                  style={[sheet.logBtn, { backgroundColor: meta?.color ?? colors.primary }, !canLog && sheet.logBtnDisabled]}
                  onPress={handleLog}
                  disabled={!canLog}
                  activeOpacity={0.85}
                >
                  <Text style={sheet.logBtnText}>
                    {createEntry.isPending ? 'Logging…' : `Log ${co2Preview ? `· ${co2Preview} kg` : ''}`}
                  </Text>
                </TouchableOpacity>
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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
  },
  heading: {
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subheading: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  totalPill: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  totalPillText: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  tabsRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  group: { marginBottom: spacing.md },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  groupIcon: { fontSize: 13 },
  groupLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  factorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    marginBottom: 6,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  factorContent: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  factorItem: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  factorUnit: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  factorCo2: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    paddingRight: spacing.md,
  },
  todaySection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.surface,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  todayTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  todayTotal: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  loggedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 8,
  },
  loggedDot: { width: 8, height: 8, borderRadius: 4 },
  loggedItem: { flex: 1, fontSize: typography.sizes.sm, color: colors.textPrimary },
  loggedValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
});

const detect = StyleSheet.create({
  enableBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.transport}30`,
  },
  enableIcon: { fontSize: 20 },
  enableTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  enableSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  enableCaret: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: colors.transport,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  tripCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.transport,
  },
  tripLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tripIcon: { fontSize: 18 },
  tripDistance: {
    fontSize: typography.sizes.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tripSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 1,
  },
  tripKg: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.sm,
    color: colors.transport,
  },
  logBtn: {
    backgroundColor: colors.transport,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  logBtnText: {
    fontSize: typography.sizes.xs,
    fontWeight: '700',
    color: '#fff',
  },
  dismissText: {
    fontSize: 16,
    color: colors.textSecondary,
    paddingHorizontal: 4,
  },
});

const sheet = StyleSheet.create({
  container: { paddingHorizontal: spacing.sm, paddingBottom: spacing.xl },
  preview: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  previewLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  previewValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 46,
  },
  previewSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 4,
  },
  qtyLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.sizes.lg,
    color: colors.textPrimary,
    fontFamily: 'JetBrainsMono_700Bold',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  logBtn: {
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  logBtnDisabled: { opacity: 0.45 },
  logBtnText: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
