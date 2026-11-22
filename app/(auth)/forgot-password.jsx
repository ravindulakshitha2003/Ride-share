import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import AuthLayout from '../../components/AuthLayout';
import IconField from '../../components/IconField';
import { getErrorMessage } from '../../api/client';
import { requestPasswordReset } from '../../api/emailAuth';

// Step 1 of 3: enter your email and we send a 6-digit code.
export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : ''
  );
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSend() {
    if (submitting) return;

    setApiError('');

    const clean = email.trim().toLowerCase();

    if (!/^\S+@\S+\.\S+$/.test(clean)) {
      setError('Enter a valid email address.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      await requestPasswordReset(clean);

      router.push({
        pathname: '/(auth)/verify-reset-code',
        params: { email: clean },
      });
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email. We'll send you a 6-digit code to securely reset your password."
      footer={
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.backText}>←  Back to sign in</Text>
        </TouchableOpacity>
      }
    >
      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <IconField
        label="Email"
        icon="mail-outline"
        placeholder="you@example.com"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setError('');
        }}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!submitting}
      />

      <TouchableOpacity
        style={[styles.button, submitting && styles.disabled]}
        onPress={handleSend}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Send reset code</Text>
        )}
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  apiError: {
    color: colors.error,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  back: { alignItems: 'center', marginTop: 20 },
  backText: { color: colors.primary, fontWeight: 'bold' },
});
