import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { colors, typography } from '@/lib/theme';
import { VInput, VButton, VToast, VIcon } from '@/components/ui';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { resetPassword, authError, setAuthError } = useAuthStore();

  const handleReset = async () => {
    setAuthError(null);
    if (!email) {
      setAuthError('Please enter your email address.');
      return;
    }
    setLoading(true);
    await resetPassword(email);
    setLoading(false);
    if (!authError) setSent(true);
  };

  if (sent) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successTitle}>Email sent</Text>
        <Text style={styles.successBody}>
          Check {email} for a password reset link. It expires in 1 hour.
        </Text>
        <VButton
          label="Back to Sign In"
          variant="secondary"
          onPress={() => router.back()}
          style={styles.backButton}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <VIcon name="chevron-left" size={20} color={colors.primary} strokeWidth={2} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        <View style={styles.form}>
          <VInput
            label="Email"
            value={email}
            onChangeText={(v) => { setEmail(v); setAuthError(null); }}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />

          {authError ? (
            <VToast
              message={authError}
              tone="error"
              icon={<VIcon name="close" size={16} color={colors.danger} strokeWidth={2} />}
              onDismiss={() => setAuthError(null)}
            />
          ) : null}

          <VButton
            label="Send Reset Link"
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleReset}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 24, paddingTop: 60 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 40 },
  backText: { fontSize: 15, color: colors.primary, fontWeight: '500' },
  title: { fontFamily: typography.fontFamilyDisplay, fontSize: 28, fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: 8, letterSpacing: typography.letterSpacing.tight },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 32, lineHeight: 22 },
  form: { gap: 16 },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  successBody: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  backButton: { marginTop: 24, width: 200 },
});
