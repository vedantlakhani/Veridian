import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { VInput, VButton, VSkeleton } from '@/components/ui';
import { useEmissionFactors } from '@/hooks/useEmissionFactors';
import type { EmissionFactor } from '@/types/emission';
import { colors, spacing, typography } from '@/lib/theme';

interface EnergyFormProps {
  onSubmit: (factor: EmissionFactor, quantity: number) => void;
  isSubmitting?: boolean;
}

export function EnergyForm({ onSubmit, isSubmitting = false }: EnergyFormProps) {
  const [selectedFactor, setSelectedFactor] = useState<EmissionFactor | null>(null);
  const [quantity, setQuantity] = useState('');
  const { data: factors = [], isLoading } = useEmissionFactors('energy');

  const handleSubmit = () => {
    const qty = parseFloat(quantity);
    if (selectedFactor && qty > 0) {
      onSubmit(selectedFactor, qty);
    }
  };

  const canSubmit = !!selectedFactor && parseFloat(quantity) > 0 && !isSubmitting;

  return (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      {isLoading ? (
        <>
          <VSkeleton width="100%" height={48} style={{ marginBottom: spacing.sm }} />
          <VSkeleton width="100%" height={48} style={{ marginBottom: spacing.sm }} />
          <VSkeleton width="100%" height={48} />
        </>
      ) : (
        factors.map((factor) => (
          <TouchableOpacity
            key={factor.id}
            style={[styles.factorRow, selectedFactor?.id === factor.id && styles.factorRowSelected]}
            onPress={() => setSelectedFactor(factor)}
            activeOpacity={0.7}
          >
            <View>
              <Text style={styles.factorItem}>{factor.item}</Text>
              <Text style={styles.factorSub}>{factor.subcategory} · {factor.kg_co2e} kg CO₂e per {factor.unit}</Text>
            </View>
            {selectedFactor?.id === factor.id && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))
      )}
      {selectedFactor ? (
        <VInput
          label={`Quantity (${selectedFactor.unit})`}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="decimal-pad"
          placeholder="0.0"
          style={{ marginTop: spacing.md }}
        />
      ) : null}
      <VButton
        label={isSubmitting ? 'Logging…' : 'Log Entry'}
        onPress={handleSubmit}
        disabled={!canSubmit}
        style={{ marginTop: spacing.md, marginBottom: spacing.xl }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 420 },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  factorRowSelected: {
    backgroundColor: `${colors.primary}18`, // primary at ~10% opacity
  },
  factorItem: {
    fontSize: typography.sizes.md,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  factorSub: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkmark: {
    fontSize: typography.sizes.lg,
    color: colors.primary,
    fontWeight: '700',
  },
});
