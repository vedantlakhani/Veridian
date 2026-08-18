import { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUpdateEntry } from '@/hooks/useEmissionEntries';
import { useAuthStore } from '@/stores/authStore';
import { VInput, VButton, VBadge, VCard, VText, VIcon, VPressable } from '@/components/ui';
import type { EmissionEntryWithFactor } from '@/types/emission';
import { colors, spacing } from '@/lib/theme';
import { humanizeSubcategory } from '@/lib/format';
import { groupLabelForFactor } from '@/lib/naicsGroups';

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const updateEntry = useUpdateEntry();

  // Fetch the single entry by id
  const { data: entry, isLoading } = useQuery({
    queryKey: ['emission_entry', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emission_entries')
        .select('*, emission_factors(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as EmissionEntryWithFactor;
    },
    enabled: !!id,
  });

  const [quantity, setQuantity] = useState('');

  // Pre-fill quantity when entry loads
  useEffect(() => {
    if (entry) {
      setQuantity(String(entry.quantity));
    }
  }, [entry]);

  const handleSave = () => {
    if (!entry || !user?.id) return;
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) return;

    updateEntry.mutate(
      {
        id: entry.id,
        userId: user.id,
        factor: entry.emission_factors,
        quantity: qty,
        loggedAt: entry.logged_at,
      },
      { onSuccess: () => router.back() }
    );
  };

  if (isLoading || !entry) {
    return (
      <SafeAreaView style={styles.centered} edges={['top', 'bottom']}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const canSave = parseFloat(quantity) > 0 && !updateEntry.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <VText variant="title">Edit entry</VText>
        <VPressable
          onPress={() => router.back()}
          haptic="light"
          hitSlop={12}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <VIcon name="close" size={20} color={colors.textSecondary} />
        </VPressable>
      </View>

      <View style={styles.content}>
        <VCard elevation="sm" style={styles.detailCard}>
          <VBadge
            label={entry.emission_factors.category}
            variant={entry.emission_factors.category}
          />
          <VText variant="heading" style={styles.itemName}>
            {entry.emission_factors.item}
          </VText>
          <VText variant="caption" style={styles.subcategory}>
            {groupLabelForFactor(entry.emission_factors.subcategory) ??
              humanizeSubcategory(entry.emission_factors.subcategory)}
          </VText>
        </VCard>

        <VInput
          label={`Quantity (${entry.emission_factors.unit})`}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          placeholder="0.0"
          style={styles.input}
        />

        <VText variant="body" style={styles.previewLabel}>
          Estimated:{' '}
          <VText variant="mono" style={styles.previewValue}>
            {(parseFloat(quantity || '0') * entry.emission_factors.kg_co2e).toFixed(3)} kg CO&#8322;e
          </VText>
        </VText>

        <VButton
          label="Save changes"
          loading={updateEntry.isPending}
          onPress={handleSave}
          disabled={!canSave}
          style={styles.saveButton}
        />

        <VPressable onPress={() => router.back()} haptic="light" style={styles.cancelButton}>
          <VText variant="body" style={styles.cancelText}>
            Cancel
          </VText>
        </VPressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSunken,
  },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  detailCard: { marginBottom: spacing.lg },
  itemName: {
    marginTop: spacing.sm,
  },
  subcategory: { marginTop: 4 },
  input: { marginBottom: spacing.sm },
  previewLabel: {
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  previewValue: {
    fontWeight: '600',
    color: colors.textPrimary,
  },
  saveButton: { marginBottom: spacing.md },
  cancelButton: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { color: colors.textSecondary },
});
