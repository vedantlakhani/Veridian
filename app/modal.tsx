import { Link, Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { VText } from '@/components/ui';
import { colors, spacing, typography } from '@/lib/theme';

export default function ModalScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Modal' }} />
      <View style={styles.container}>
        <VText variant="title" style={styles.title}>This is a modal</VText>
        <Link href="/" dismissTo style={styles.link}>
          <VText style={styles.linkText}>Go to home screen</VText>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.sizes.xxl,
  },
  link: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
  },
  linkText: {
    color: colors.primary,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
});
