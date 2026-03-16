import { View, StyleSheet, type ViewProps } from 'react-native';
import { colors, shadows, radii } from '@/lib/theme';

type ElevationVariant = 'flat' | 'sm' | 'md' | 'lg';

interface VCardProps extends ViewProps {
  elevation?: ElevationVariant;
  padding?: number;
}

export function VCard({ elevation = 'sm', padding = 16, style, children, ...props }: VCardProps) {
  const elevationStyle = elevation === 'flat' ? undefined : shadows[elevation];
  return (
    <View
      style={[styles.base, elevationStyle, { padding }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
