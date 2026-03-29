import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, withSpring, withTiming, useAnimatedStyle,
} from 'react-native-reanimated';
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

  const breatheScale = useSharedValue(0.95);
  const breatheOpacity = useSharedValue(0);

  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breatheScale.value }],
    opacity: breatheOpacity.value,
  }));

  const handleCategorySelect = (cat: EmissionCategory) => {
    setSelectedCategory(cat);
    // Reset breathe state BEFORE opening (form content is stale from previous selection)
    breatheScale.value = 0.95;
    breatheOpacity.value = 0;
    setSheetOpen(true);
    // Trigger breathe-in with slight delay so sheet is visible first
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Log Emission</Text>
        <Text style={styles.subheading}>Select a category to begin</Text>
        <CategorySelector selected={selectedCategory} onSelect={handleCategorySelect} />
      </ScrollView>

      <VBottomSheet isOpen={sheetOpen} onClose={handleClose} title={sheetTitle}>
        <Animated.View style={[styles.formContainer, breatheStyle]}>
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
  },
  subheading: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  formContainer: {
    // No specific layout — just wraps children for animation
    // VBottomSheet handles its own padding
  },
});
