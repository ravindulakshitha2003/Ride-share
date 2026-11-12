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

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import useAuth from '../../hooks/useAuth';
import { getErrorMessage } from '../../api/client';

// Where people land after logging in: the dashboard (the Search tab).
const DASHBOARD_ROUTE = '/';

// A text box with an icon on the left. Password boxes get a show/hide eye.
function IconField({
  label,
  icon,
  error,
  secureTextEntry,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.fieldRow,
          focused && styles.fieldFocused,
          error && styles.fieldErrorBorder,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={error ? colors.error : colors.primary}
          style={styles.fieldIcon}
        />

        <TextInput
          style={styles.fieldInput}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isPassword && hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setHidden((current) => !current)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

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
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      validationErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      validationErrors.password = 'Password is required.';
    }

    return validationErrors;
  }

  // Handle the login button.
  async function handleLogin() {
    if (submitting) return;

    setApiError('');

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      await login(email.trim().toLowerCase(), password);

      // Login worked: open the dashboard. "replace" means Back does not return to the login screen.
      router.replace(DASHBOARD_ROUTE);
    } catch (error) {
      // A failed login stays on this screen and shows the message.
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

        {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

        <IconField
          label="Email"
          icon="mail-outline"
          placeholder="you@example.com"
          value={email}
          onChangeText={(value) => {
            setEmail(value);

            if (errors.email) {
              setErrors((previous) => ({ ...previous, email: '' }));
            }
          }}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!submitting}
        />

        <IconField
          label="Password"
          icon="lock-closed-outline"
          placeholder="Your password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);

            if (errors.password) {
              setErrors((previous) => ({ ...previous, password: '' }));
            }
          }}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          editable={!submitting}
        />

        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Log in</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>

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

  // ---- Fields with icons ----
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },

  fieldFocused: {
    borderColor: colors.primary,
  },

  fieldErrorBorder: {
    borderColor: colors.error,
  },

  fieldIcon: {
    marginRight: 10,
  },

  fieldInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
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