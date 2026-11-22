import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import AuthLayout from '../../components/AuthLayout';
import IconField from '../../components/IconField';
import { passwordStrength } from '../../utils/passwordStrength';
import { getErrorMessage } from '../../api/client';
import { resetPassword } from '../../api/emailAuth';

// Step 3 of 3: choose the new password.
export default function ResetPassword() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const resetToken = typeof params.resetToken === 'string' ? params.resetToken : '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const strength = passwordStrength(password);

  async function handleReset() {
    if (submitting) return;

    setApiError('');

    const next = {};

    if (password.length < 8) next.password = 'Use at least 8 characters.';
    if (confirm !== password) next.confirm = 'Passwords do not match.';

    setErrors(next);

    if (Object.keys(next).length > 0) return;

    setSubmitting(true);

    try {
      await resetPassword(resetToken, password);

      Alert.alert(
        'Password updated',
        'You can now log in with your new password.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (err) {
      setApiError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Choose a strong password you haven't used for this account before."
      footer={
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.backText}>←  Back to sign in</Text>
        </TouchableOpacity>
      }
    >
      {!resetToken ? (
        <Text style={styles.apiError}>
          Your reset session is missing. Please start again from Forgot password.
        </Text>
      ) : null}

      {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

      <IconField
        label="New password"
        icon="lock-closed-outline"
        placeholder="At least 8 characters"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setErrors((current) => ({ ...current, password: undefined }));
        }}
        error={errors.password}
        secureTextEntry
        autoCapitalize="none"
        editable={!submitting}
      />

      {/* Strength bar: four segments */}
      <View style={styles.bars}>
        {[1, 2, 3, 4].map((segment) => (
          <View
            key={segment}
            style={[
              styles.bar,
              segment <= strength.level && { backgroundColor: strength.color },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strength, { color: strength.level ? strength.color : colors.text }]}>
        {strength.label ? `${strength.label}  ·  ` : ''}At least 8 characters
      </Text>

      <IconField
        label="Confirm new password"
        icon="lock-closed-outline"
        placeholder="Repeat the new password"
        value={confirm}
        onChangeText={(value) => {
          setConfirm(value);
          setErrors((current) => ({ ...current, confirm: undefined }));
        }}
        error={errors.confirm}
        secureTextEntry
        autoCapitalize="none"
        editable={!submitting}
      />

      <TouchableOpacity
        style={[styles.button, (submitting || !resetToken) && styles.disabled]}
        onPress={handleReset}
        disabled={submitting || !resetToken}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>Reset password</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>You'll be signed out of all other sessions.</Text>
      <Text style={styles.note}>Reset codes expire after 15 minutes.</Text>
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
  bars: { flexDirection: 'row', gap: 6, marginTop: 10 },
  bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: '#E5E7EB' },
  strength: { fontSize: 12, marginTop: 6 },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  note: { color: colors.text, opacity: 0.65, fontSize: 12, marginTop: 10 },
  back: { alignItems: 'center', marginTop: 20 },
  backText: { color: colors.primary, fontWeight: 'bold' },
});
