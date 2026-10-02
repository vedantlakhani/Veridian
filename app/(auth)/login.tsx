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
import { useAuthStore, isGoogleSignInAvailable, isAppleSignInAvailable } from '@/stores/authStore';
import { colors, typography } from '@/lib/theme';
import { VInput, VButton, VToast, VIcon } from '@/components/ui';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithEmail, signInWithGoogle, signInWithApple, authError, setAuthError } = useAuthStore();

  const handleEmailLogin = async () => {
    if (!email || !password) {
      setAuthError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    await signInWithEmail(email, password);
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  const handleApple = async () => {
    setLoading(true);
    await signInWithApple();
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>Veridian</Text>
          <Text style={styles.tagline}>Track your carbon footprint</Text>
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
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
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
            label="Sign In"
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleEmailLogin}
            style={styles.primaryButton}
          />

          <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Link>

          {/* Social sign-in only appears when the provider is actually configured
              in this build (see stores/authStore.ts), never as a dead button. */}
          {(isGoogleSignInAvailable || isAppleSignInAvailable) && (
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>
          )}

          {isGoogleSignInAvailable && (
            <VButton
              label="Continue with Google"
              variant="secondary"
              fullWidth
              disabled={loading}
              onPress={handleGoogle}
            />
          )}

          {isAppleSignInAvailable && (
            <VButton
              label="Continue with Apple"
              variant="apple"
              fullWidth
              disabled={loading}
              onPress={handleApple}
            />
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/signup">
            <Text style={styles.footerLink}>Sign up</Text>
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
  forgotLink: { alignSelf: 'center' },
  forgotText: { fontSize: 13, color: colors.primary, fontWeight: '500' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.divider },
  dividerText: { fontSize: 13, color: colors.textSecondary },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 14, color: colors.textSecondary },
  footerLink: { fontSize: 14, color: colors.primary, fontWeight: '600' },
});
