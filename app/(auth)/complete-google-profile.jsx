// Shown once, the first time someone signs in with Google.
// Google gives us the name, email and photo; we still need a mobile number.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import useAuth from '../../hooks/useAuth';
import { getErrorMessage } from '../../api/client';
import { Field } from '../../components/Field';
import { Chips } from '../../components/Chips';
import { notify } from '../../utils/notify';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

export default function CompleteGoogleProfile() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { completeGoogleSignup } = useAuth();

  const googleSignupToken = String(params.googleSignupToken ?? '');
  const email = String(params.email ?? '');
  const picture = String(params.picture ?? '');

  const [name, setName] = useState(String(params.name ?? ''));
  const [mobile, setMobile] = useState('+94');
  const [gender, setGender] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'Name is required.';
    if (!/^(?:0\d{9}|\+94\d{9})$/.test(mobile.trim())) {
      e.mobile = 'Use the format +94771234567.';
    }
    return e;
  }

  async function handleSubmit() {
    if (submitting) return;
    setApiError('');
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    setSubmitting(true);
    try {
      const user = await completeGoogleSignup({
        googleSignupToken,
        mobile,
        name,
        gender: gender || undefined,
      });

      await notify('Welcome to Share-Ride', `Hi ${user?.name ?? 'rider'}!`);
      router.replace('/');
    } catch (error) {
      const code = error.response?.data?.code;

      if (code === 'GOOGLE_SIGNUP_EXPIRED') {
        setApiError('This took too long. Please sign in with Google again.');
      } else {
        setApiError(getErrorMessage(error));
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Opened without coming from the login screen.
  if (!googleSignupToken) {
    return (
      <View style={[styles.flex, styles.container]}>
        <Text style={styles.subtitle}>Please sign in with Google again.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/login')}>
          <Text style={styles.buttonText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Almost done</Text>
        <Text style={styles.subtitle}>
          Add your mobile number so drivers and passengers can reach you.
        </Text>

        <View style={styles.googleCard}>
          {picture ? <Image source={{ uri: picture }} style={styles.avatar} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Signed in with Google</Text>
            <Text style={styles.cardEmail}>{email}</Text>
          </View>
        </View>

        {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

        <Field
          label="Full name"
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (errors.name) setErrors((p) => ({ ...p, name: '' }));
          }}
          error={errors.name}
          autoCapitalize="words"
          editable={!submitting}
        />

        <Field
          label="Mobile number"
          value={mobile}
          onChangeText={(v) => {
            setMobile(v);
            if (errors.mobile) setErrors((p) => ({ ...p, mobile: '' }));
          }}
          error={errors.mobile}
          keyboardType="phone-pad"
          placeholder="+94771234567"
          editable={!submitting}
        />

        <Chips
          label="Gender (optional)"
          options={GENDER_OPTIONS}
          value={gender}
          onChange={setGender}
        />

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          You'll start as a passenger. You can add driver and vehicle details later.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.secondary },
  subtitle: { fontSize: 15, color: colors.text, marginTop: 4, marginBottom: 20 },
  googleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  cardLabel: { fontSize: 12, color: colors.textMuted },
  cardEmail: { fontSize: 15, fontWeight: '600', color: colors.text },
  apiError: {
    color: colors.error,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  hint: { textAlign: 'center', color: colors.textMuted, fontSize: 13, marginTop: 14 },
});
