import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import AuthLayout from '../../components/AuthLayout';
import CodeInput from '../../components/CodeInput';
import useCountdown from '../../hooks/useCountdown';
import maskEmail from '../../utils/maskEmail';
import { getErrorMessage } from '../../api/client';
import { requestPasswordReset, verifyResetCode } from '../../api/emailAuth';

// Step 2 of 3: type the 6-digit code from the email.
export default function VerifyResetCode() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = typeof params.email === 'string' ? params.email : '';

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const timer = useCountdown(30);

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
      const { resetToken } = await verifyResetCode(email, code);

      router.replace({
        pathname: '/(auth)/reset-password',
        params: { resetToken },
      });
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
      await requestPasswordReset(email);
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
      title="Verify it's you"
      subtitle={`Enter the six-digit code sent to ${maskEmail(email)}`}
      footer={
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.backText}>←  Back to sign in</Text>
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
          <Text style={styles.buttonText}>Verify and continue  →</Text>
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
  back: { alignItems: 'center', marginTop: 20 },
  backText: { color: colors.primary, fontWeight: 'bold' },
});
