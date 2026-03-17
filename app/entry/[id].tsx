import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUpdateEntry } from '@/hooks/useEmissionEntries';
import { useAuthStore } from '@/stores/authStore';
import { VInput, VButton, VBadge, VCard } from '@/components/ui';
import type { EmissionEntryWithFactor } from '@/types/emission';
import { colors, spacing, typography } from '@/lib/theme';

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
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const canSave = parseFloat(quantity) > 0 && !updateEntry.isPending;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Edit Entry</Text>

      <VCard elevation="sm" style={styles.detailCard}>
        <VBadge
          label={entry.emission_factors.category}
          variant={entry.emission_factors.category}
        />
        <Text style={styles.itemName}>{entry.emission_factors.item}</Text>
        <Text style={styles.subcategory}>{entry.emission_factors.subcategory}</Text>
      </VCard>

      <VInput
        label={`Quantity (${entry.emission_factors.unit})`}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        placeholder="0.0"
        style={styles.input}
      />

      <Text style={styles.previewLabel}>
        Estimated:{' '}
        <Text style={styles.previewValue}>
          {(parseFloat(quantity || '0') * entry.emission_factors.kg_co2e).toFixed(3)} kg CO&#8322;e
        </Text>
      </Text>

      <VButton
        label={updateEntry.isPending ? 'Saving...' : 'Save Changes'}
        onPress={handleSave}
        disabled={!canSave}
        style={styles.saveButton}
      />

      <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: {
    fontSize: typography.sizes.xxl, fontWeight: '700',
    color: colors.textPrimary, marginBottom: spacing.lg,
  },
  detailCard: { marginBottom: spacing.lg },
  itemName: {
    fontSize: typography.sizes.lg, fontWeight: '600',
    color: colors.textPrimary, marginTop: spacing.sm,
  },
  subcategory: { fontSize: typography.sizes.sm, color: colors.textSecondary, marginTop: 4 },
  input: { marginBottom: spacing.sm },
  previewLabel: {
    fontSize: typography.sizes.sm, color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  previewValue: {
    fontFamily: 'JetBrainsMono', fontWeight: '600', color: colors.textPrimary,
  },
  saveButton: { marginBottom: spacing.md },
  cancelButton: { alignItems: 'center', paddingVertical: spacing.sm },
  cancelText: { fontSize: typography.sizes.md, color: colors.textSecondary },
});
