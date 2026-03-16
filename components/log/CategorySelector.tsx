import { View, StyleSheet } from 'react-native';
import { VChip } from '@/components/ui';
import type { EmissionCategory } from '@/types/emission';
import { spacing } from '@/lib/theme';

const CATEGORIES: { key: EmissionCategory; label: string }[] = [
  { key: 'food', label: 'Food' },
  { key: 'transport', label: 'Transport' },
  { key: 'energy', label: 'Energy' },
];

interface CategorySelectorProps {
  selected: EmissionCategory | null;
  onSelect: (cat: EmissionCategory) => void;
}

export function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <View style={styles.row}>
      {CATEGORIES.map((cat) => (
        <VChip
          key={cat.key}
          label={cat.label}
          selected={selected === cat.key}
          onPress={() => onSelect(cat.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
