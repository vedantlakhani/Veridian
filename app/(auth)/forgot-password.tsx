import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Back to Sign In</Text>
        </TouchableOpacity>
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
          <Text style={styles.backArrow}>←</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={(v) => { setEmail(v); setAuthError(null); }}
            placeholder="you@example.com"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />
        </View>

        {authError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAF9' },
  container: { flex: 1, padding: 24, paddingTop: 60 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 40 },
  backArrow: { fontSize: 20, color: '#1B7A4A' },
  backText: { fontSize: 15, color: '#1B7A4A', fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 32, lineHeight: 22 },
  field: { gap: 6, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: '#DC2626' },
  primaryButton: {
    height: 52,
    backgroundColor: '#1B7A4A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8FAF9',
  },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 12 },
  successBody: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  backButton: {
    marginTop: 24,
    height: 52,
    width: 200,
    backgroundColor: '#1B7A4A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});
