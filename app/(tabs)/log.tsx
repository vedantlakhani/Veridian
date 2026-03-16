import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { VBottomSheet } from '@/components/ui';
import { CategorySelector } from '@/components/log/CategorySelector';
import { FoodForm } from '@/components/log/FoodForm';
import { TransportForm } from '@/components/log/TransportForm';
import { EnergyForm } from '@/components/log/EnergyForm';
import { useCreateEntry } from '@/hooks/useEmissionEntries';
import { useAuthStore } from '@/stores/authStore';
import type { EmissionCategory, EmissionFactor } from '@/types/emission';
import { colors, spacing, typography } from '@/lib/theme';

export default function LogScreen() {
  const { user } = useAuthStore();
  const createEntry = useCreateEntry();
  const [selectedCategory, setSelectedCategory] = useState<EmissionCategory | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleCategorySelect = (cat: EmissionCategory) => {
    setSelectedCategory(cat);
    setSheetOpen(true);
  };

  const handleClose = () => {
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Log Emission</Text>
        <Text style={styles.subheading}>Select a category to begin</Text>
        <CategorySelector selected={selectedCategory} onSelect={handleCategorySelect} />
      </ScrollView>

      <VBottomSheet isOpen={sheetOpen} onClose={handleClose} title={sheetTitle}>
        {selectedCategory === 'food' && (
          <FoodForm onSubmit={handleSubmit} isSubmitting={createEntry.isPending} />
        )}
        {selectedCategory === 'transport' && (
          <TransportForm onSubmit={handleSubmit} isSubmitting={createEntry.isPending} />
        )}
        {selectedCategory === 'energy' && (
          <EnergyForm onSubmit={handleSubmit} isSubmitting={createEntry.isPending} />
        )}
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
  },
  subheading: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
});
