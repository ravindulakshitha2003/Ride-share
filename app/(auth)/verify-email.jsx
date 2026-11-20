import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import AuthLayout from '../../components/AuthLayout';
import CodeInput from '../../components/CodeInput';
import useCountdown from '../../hooks/useCountdown';
import maskEmail from '../../utils/maskEmail';
import { getErrorMessage } from '../../api/client';
import { resendEmailCode, verifyEmailCode } from '../../api/emailAuth';

// Shown right after registration: confirm the email with the 6-digit code.
export default function VerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = typeof params.email === 'string' ? params.email : '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const timer = useCountdown(30);

  function goToLogin() {
    router.replace('/(auth)/login');
  }

  async function handleVerify() {
    if (submitting) return;

    if (code.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }

    setError('');
    setInfo('');
    setSubmitting(true);

    try {
      await verifyEmailCode(email, code);

      Alert.alert('Email verified', 'Thank you! You can now log in.', [
        { text: 'Log in', onPress: goToLogin },
      ]);
    } catch (err) {
      setError(getErrorMessage(err));
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    if (timer.seconds > 0 || resending) return;

    setResending(true);
    setError('');
    setInfo('');

    try {
      await resendEmailCode(email);
      setInfo('A new code is on its way.');
      timer.restart(30);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle={`Your account is created. Enter the six-digit code we sent to ${maskEmail(email)} to confirm your email.`}
      footer={
        <TouchableOpacity style={styles.skip} onPress={goToLogin}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      }
    >
      <CodeInput
        value={code}
        onChange={(value) => {
          setCode(value);
          setError('');
        }}
        error={Boolean(error)}
        editable={!submitting}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}

      {timer.seconds > 0 ? (
        <Text style={styles.timer}>Resend code in {timer.label}</Text>
      ) : (
        <TouchableOpacity onPress={handleResend} disabled={resending}>
          <Text style={styles.resend}>
            {resending ? 'Sending...' : 'Resend code'}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, (submitting || code.length !== 6) && styles.disabled]}
        onPress={handleVerify}
        disabled={submitting || code.length !== 6}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Verify email  →</Text>
        )}
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.error, fontSize: 13, marginTop: 12 },
  info: { color: '#16A34A', fontSize: 13, marginTop: 12 },
  timer: { color: colors.text, opacity: 0.7, fontSize: 13, marginTop: 14 },
  resend: { color: colors.primary, fontWeight: 'bold', marginTop: 14 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 22,
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  skip: { alignItems: 'center', marginTop: 20 },
  skipText: { color: colors.primary, fontWeight: 'bold' },
});
