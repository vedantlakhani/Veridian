import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue, withSpring, withTiming, useAnimatedStyle,
} from 'react-native-reanimated';
import { VBottomSheet, VCard, VBadge, VSkeleton, VEmptyState } from '@/components/ui';
import { FoodForm } from '@/components/log/FoodForm';
import { TransportForm } from '@/components/log/TransportForm';
import { EnergyForm } from '@/components/log/EnergyForm';
import { useCreateEntry, useEmissionEntries } from '@/hooks/useEmissionEntries';
import { useAuthStore } from '@/stores/authStore';
import { getLocalDateString } from '@/lib/emissions';
import type { EmissionCategory, EmissionFactor } from '@/types/emission';
import { colors, spacing, typography, radii } from '@/lib/theme';

const CATEGORY_CARDS: { key: EmissionCategory; label: string; icon: string; color: string }[] = [
  { key: 'food', label: 'Food', icon: '🌿', color: colors.food },
  { key: 'transport', label: 'Transport', icon: '🚗', color: colors.transport },
  { key: 'energy', label: 'Energy', icon: '⚡', color: colors.energy },
];

export default function LogScreen() {
  const { user } = useAuthStore();
  const createEntry = useCreateEntry();
  const [selectedCategory, setSelectedCategory] = useState<EmissionCategory | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const today = getLocalDateString();
  const { data: allEntries = [], isLoading: entriesLoading } = useEmissionEntries(user?.id);
  const todayEntries = allEntries.filter(
    e => getLocalDateString(new Date(e.logged_at)) === today
  );

  const breatheScale = useSharedValue(0.95);
  const breatheOpacity = useSharedValue(0);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheScale.value }],
    opacity: breatheOpacity.value,
  }));

  const handleCategorySelect = (cat: EmissionCategory) => {
    setSelectedCategory(cat);
    breatheScale.value = 0.95;
    breatheOpacity.value = 0;
    setSheetOpen(true);
    setTimeout(() => {
      breatheScale.value = withSpring(1, { damping: 18, stiffness: 180 });
      breatheOpacity.value = withTiming(1, { duration: 250 });
    }, 80);
  };

  const handleClose = () => {
    breatheScale.value = 0.95;
    breatheOpacity.value = 0;
    setSheetOpen(false);
  };

  const handleSubmit = (factor: EmissionFactor, quantity: number) => {
    if (!user?.id) return;
    createEntry.mutate(
      { userId: user.id, factor, quantity },
      { onSuccess: () => setSheetOpen(false) }
    );
  };

  const sheetTitle =
    selectedCategory === 'food' ? 'Log Food' :
    selectedCategory === 'transport' ? 'Log Transport' :
    selectedCategory === 'energy' ? 'Log Energy' : '';

  const todayTotal = todayEntries.reduce((sum, e) => sum + e.kg_co2e_total, 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Log Entry</Text>
        <Text style={styles.subheading}>What are you tracking today?</Text>

        {/* Category cards */}
        <View style={styles.categoryGrid}>
          {CATEGORY_CARDS.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.categoryCard, { borderColor: `${cat.color}40` }]}
              onPress={() => handleCategorySelect(cat.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's log */}
        <View style={styles.todayHeader}>
          <Text style={styles.sectionTitle}>Today</Text>
          {todayEntries.length > 0 && (
            <Text style={styles.todayTotal}>
              {todayTotal.toFixed(1)} kg CO₂e
            </Text>
          )}
        </View>

        {entriesLoading ? (
          <>
            <View style={{ marginBottom: spacing.sm }}><VSkeleton width="100%" height={56} /></View>
            <View style={{ marginBottom: spacing.sm }}><VSkeleton width="100%" height={56} /></View>
          </>
        ) : todayEntries.length === 0 ? (
          <VEmptyState
            title="Nothing logged yet"
            body="Tap a category above to record your first entry today"
          />
        ) : (
          todayEntries.map((entry) => (
            <VCard key={entry.id} elevation="sm" style={styles.entryCard}>
              <View style={styles.entryRow}>
                <View style={styles.entryLeft}>
                  <VBadge
                    label={entry.emission_factors.category}
                    variant={entry.emission_factors.category}
                  />
                  <Text style={styles.entryItem} numberOfLines={1}>
                    {entry.emission_factors.item}
                  </Text>
                </View>
                <Text style={styles.entryValue}>
                  {entry.kg_co2e_total.toFixed(2)} kg
                </Text>
              </View>
            </VCard>
          ))
        )}
      </ScrollView>

      <VBottomSheet isOpen={sheetOpen} onClose={handleClose} title={sheetTitle}>
        <Animated.View style={breatheStyle}>
          {selectedCategory === 'food' && (
            <FoodForm onSubmit={handleSubmit} isSubmitting={createEntry.isPending} />
          )}
          {selectedCategory === 'transport' && (
            <TransportForm onSubmit={handleSubmit} isSubmitting={createEntry.isPending} />
          )}
          {selectedCategory === 'energy' && (
            <EnergyForm onSubmit={handleSubmit} isSubmitting={createEntry.isPending} />
          )}
        </Animated.View>
      </VBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: {
    fontSize: typography.sizes.xxl,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },
  subheading: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  categoryGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  todayTotal: {
    fontFamily: 'JetBrainsMono',
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  entryCard: { marginBottom: spacing.sm },
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  entryLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  entryItem: { fontSize: typography.sizes.sm, color: colors.textPrimary, flex: 1 },
  entryValue: {
    fontFamily: 'JetBrainsMono_700Bold',
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
