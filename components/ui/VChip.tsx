import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, typography, radii, spacing } from '@/lib/theme';

interface VChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
}

export function VChip({ label, selected = false, onPress, disabled = false }: VChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipDefault,
        disabled && styles.chipDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, selected ? styles.labelSelected : styles.labelDefault]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignSelf: 'flex-start',
  },
  chipDefault: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipDisabled: { opacity: 0.5 },
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  labelDefault: { color: colors.textSecondary },
  labelSelected: { color: '#FFFFFF' },
});
