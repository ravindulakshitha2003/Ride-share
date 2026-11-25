import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import AuthLayout from '../../components/AuthLayout';
import CodeInput from '../../components/CodeInput';
import useCountdown from '../../hooks/useCountdown';
import maskEmail from '../../utils/maskEmail';
import { getErrorMessage } from '../../api/client';
import { sendSignupCode, verifySignupCode } from '../../api/emailAuth';

// Sign up, step 2: enter the 6-digit code sent to the email.
// When it is correct, the normal registration form opens with that email filled in.
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

  function changeEmail() {
    router.replace({ pathname: '/(auth)/signup-email', params: { email } });
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
      const data = await verifySignupCode(email, code);

      // replace: Back from the form should not return to the code screen.
      router.replace({
        pathname: '/(auth)/register',
        params: { email, signupToken: data.signupToken },
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
      await sendSignupCode(email);
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
      subtitle={`Enter the six-digit code we sent to ${maskEmail(email)}.`}
      footer={
        <View style={styles.footer}>
          <Text style={styles.footerText}>Wrong email? </Text>
          <TouchableOpacity onPress={changeEmail} disabled={submitting}>
            <Text style={styles.link}>Change it</Text>
          </TouchableOpacity>
        </View>
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

      <Text style={styles.note}>Codes expire after 15 minutes.</Text>
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
  note: { color: colors.text, opacity: 0.65, fontSize: 12, marginTop: 10 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { color: colors.text },
  link: { color: colors.primary, fontWeight: 'bold' },
});
