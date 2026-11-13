
import React, { useState } from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import useAuth from '../../hooks/useAuth';
import { getErrorMessage } from '../../api/client';

export default function Login() {
  const router = useRouter();

  // Get the login function from AuthContext.
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Validate the form before sending a request.
  function validate() {
    const validationErrors = {};

    if (!email.trim()) {
      validationErrors.email = 'Email is required.';
    } else if (
      !/^\S+@\S+\.\S+$/.test(email.trim())
    ) {
      validationErrors.email =
        'Enter a valid email address.';
    }

    if (!password) {
      validationErrors.password =
        'Password is required.';
    }

    return validationErrors;
  }

  // Handle the login button.
  async function handleLogin() {
    setApiError('');

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);

      // The AuthProvider now contains the logged-in user.
      // Add your authenticated destination here if needed.
      router.replace('/');
    } catch (error) {
      setApiError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Welcome back</Text>

        <Text style={styles.subtitle}>
          Log in to continue with Share-Ride
        </Text>

        {apiError ? (
          <Text style={styles.apiError}>
            {apiError}
          </Text>
        ) : null}

        <Text style={styles.label}>Email</Text>

        <TextInput
          style={[
            styles.input,
            errors.email && styles.inputError,
          ]}
          placeholder="you@example.com"
          value={email}
          onChangeText={(value) => {
            setEmail(value);

            if (errors.email) {
              setErrors((previous) => ({
                ...previous,
                email: '',
              }));
            }
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!submitting}
        />

        {errors.email ? (
          <Text style={styles.fieldError}>
            {errors.email}
          </Text>
        ) : null}

        <Text style={styles.label}>Password</Text>

        <TextInput
          style={[
            styles.input,
            errors.password && styles.inputError,
          ]}
          placeholder="Your password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);

            if (errors.password) {
              setErrors((previous) => ({
                ...previous,
                password: '',
              }));
            }
          }}
          secureTextEntry
          autoCapitalize="none"
          editable={!submitting}
        />

        {errors.password ? (
          <Text style={styles.fieldError}>
            {errors.password}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.button,
            submitting && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>
              Log in
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
          </Text>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            disabled={submitting}
          >
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.secondary,
  },

  subtitle: {
    fontSize: 15,
    color: colors.text,
    marginTop: 4,
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 12,
  },

  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },

  inputError: {
    borderColor: colors.error,
  },

  fieldError: {
    color: colors.error,
    fontSize: 13,
    marginTop: 4,
  },

  apiError: {
    color: colors.error,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },

  footerText: {
    color: colors.text,
  },

  link: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
