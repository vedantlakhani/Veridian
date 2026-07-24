import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useLinkingURL } from 'expo-linking';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { colors, typography } from '@/lib/theme';
import { VInput, VButton, VToast, VIcon } from '@/components/ui';

type ParsedAuthLink =
  | { kind: 'pkce'; code: string }
  | { kind: 'implicit'; accessToken: string; refreshToken: string }
  | null;

function parseAuthLink(url: string | null): ParsedAuthLink {
  if (!url) return null;
  const fragment = url.split('#')[1] ?? '';
  const query = url.split('?')[1]?.split('#')[0] ?? '';

  // PKCE flow (supabase-js v2 default): veridian://reset-password?code=xxx
  const queryParams = new URLSearchParams(query);
  const code = queryParams.get('code');
  if (code) return { kind: 'pkce', code };

  // Implicit flow (legacy): veridian://reset-password#access_token=xxx&refresh_token=yyy
  const fragmentParams = new URLSearchParams(fragment);
  const accessToken = fragmentParams.get('access_token');
  const refreshToken = fragmentParams.get('refresh_token');
  if (accessToken && refreshToken) return { kind: 'implicit', accessToken, refreshToken };

  return null;
}

export default function ResetPasswordScreen() {
  const url = useLinkingURL();
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const parsed = parseAuthLink(url);
    if (!parsed) {
      setSessionError('This reset link is invalid or has expired. Request a new one.');
      return;
    }
    const exchange =
      parsed.kind === 'pkce'
        ? supabase.auth.exchangeCodeForSession(parsed.code)
        : supabase.auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken });
    exchange
      .then(({ error: setSessionErr }) => {
        if (setSessionErr) {
          setSessionError(setSessionErr.message);
        } else {
          setSessionReady(true);
        }
      });
  }, [url]);

  const handleSubmit = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successTitle}>Password updated</Text>
        <Text style={styles.successBody}>You can now sign in with your new password.</Text>
        <VButton
          label="Back to Sign In"
          variant="secondary"
          onPress={() => router.replace('/(auth)/login')}
          style={styles.backButton}
        />
      </View>
    );
  }

  if (sessionError) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successTitle}>Link expired</Text>
        <Text style={styles.successBody}>{sessionError}</Text>
        <Text selectable style={styles.debugUrl}>{url ?? '(no url captured)'}</Text>
        <VButton
          label="Request New Link"
          variant="secondary"
          onPress={() => router.replace('/(auth)/forgot-password')}
          style={styles.backButton}
        />
      </View>
    );
  }

  if (!sessionReady) {
    return (
      <View style={styles.successContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Choose a new password for your account.</Text>

        <View style={styles.form}>
          <VInput
            label="New Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(null); }}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
          />

          <VInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setError(null); }}
            placeholder="••••••••"
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
          />

          {error ? (
            <VToast
              message={error}
              tone="error"
              icon={<VIcon name="close" size={16} color={colors.danger} strokeWidth={2} />}
              onDismiss={() => setError(null)}
            />
          ) : null}

          <VButton
            label="Update Password"
            variant="primary"
            fullWidth
            loading={loading}
            onPress={handleSubmit}
            style={styles.primaryButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: 24, paddingTop: 60 },
  title: { fontFamily: typography.fontFamilyDisplay, fontSize: 28, fontWeight: typography.weights.semibold, color: colors.textPrimary, marginBottom: 8, letterSpacing: typography.letterSpacing.tight },
  subtitle: { fontSize: 15, color: colors.textSecondary, marginBottom: 32, lineHeight: 22 },
  form: { gap: 16 },
  primaryButton: { marginTop: 4 },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: colors.background,
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },
  successBody: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  debugUrl: { fontSize: 11, color: colors.textTertiary, textAlign: 'center', marginTop: 16, paddingHorizontal: 8 },
  backButton: { marginTop: 24, width: 240 },
});
