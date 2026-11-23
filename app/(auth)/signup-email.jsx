import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import AuthLayout from '../../components/AuthLayout';
import IconField from '../../components/IconField';
import { getErrorMessage } from '../../api/client';
import { sendSignupCode } from '../../api/emailAuth';

// Sign up, step 1: enter your email. We send a 6-digit code to it.
// After the code is checked, the normal registration form opens.
export default function SignupEmail() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : ''
  );
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleNext() {
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
      await sendSignupCode(clean);

      router.push({
        pathname: '/(auth)/verify-email',
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
      title="Create your account"
      subtitle="Enter your email address. We'll send you a six-digit code to confirm it's yours."
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/login')}
            disabled={submitting}
          >
            <Text style={styles.link}>Log in</Text>
          </TouchableOpacity>
        </View>
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
          if (error) setError('');
        }}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        editable={!submitting}
        returnKeyType="next"
        onSubmitEditing={handleNext}
      />

      <TouchableOpacity
        style={[styles.button, submitting && styles.disabled]}
        onPress={handleNext}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Next  →</Text>
        )}
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  apiError: {
    color: colors.error,
    fontSize: 13,
    marginTop: 8,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: colors.text },
  link: { color: colors.primary, fontWeight: 'bold' },
});
