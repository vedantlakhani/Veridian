import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { colors, typography } from '@/lib/theme';
import { VInput, VButton, VToast, VIcon } from '@/components/ui';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUpWithEmail, authError, setAuthError } = useAuthStore();

  const handleSignup = async () => {
    setAuthError(null);
    if (!email || !password) {
      setAuthError('Please enter your email and password.');
      return;
    }
    if (password.length < 8) {
      setAuthError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    setLoading(true);
    await signUpWithEmail(email, password);
    setLoading(false);
    if (!authError) setSuccess(true);
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successTitle}>Check your email</Text>
        <Text style={styles.successBody}>
          We sent a confirmation link to {email}. Click it to activate your account.
        </Text>
        <Link href="/(auth)/login" style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to Sign In</Text>
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>Veridian</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

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

          <VInput
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setAuthError(null); }}
            placeholder="At least 8 characters"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <VInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setAuthError(null); }}
            placeholder="Repeat password"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
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
            label="Create Account"
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleSignup}
            style={styles.primaryButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login">
            <Text style={styles.footerLink}>Sign in</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  logo: { fontFamily: typography.fontFamilyDisplay, fontSize: 40, fontWeight: typography.weights.semibold, color: colors.primary, letterSpacing: typography.letterSpacing.tight },
  tagline: { fontSize: 15, color: colors.textSecondary, marginTop: 8 },
  form: { gap: 16 },
  primaryButton: { marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 14, color: colors.textSecondary },
  footerLink: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  successBody: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  backLink: { marginTop: 24 },
  backLinkText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
});
