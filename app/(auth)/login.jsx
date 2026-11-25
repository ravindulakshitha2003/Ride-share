import React, { useEffect, useState } from 'react';

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
import { notify, setupNotifications } from '../../utils/notify';

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
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const busy = submitting || googleLoading;

  // Ask for notification permission + create the Android channel once.
  useEffect(() => {
    setupNotifications();
  }, []);

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
    if (busy) return;
    setApiError('');
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }
    setSubmitting(true);

    try {
      // Calls POST /api/auth/login on the auth service (port 4001).
      const profile = await login(email.trim().toLowerCase(), password);

      await notify(
        'Login successful',
        `Welcome back, ${profile?.name ?? 'rider'}!`
      );

      // "replace" means Back does not return to the login screen.
      router.replace(DASHBOARD_ROUTE);
    } catch (error) {
      const message = getErrorMessage(error);

      // A failed login stays on this screen and shows the message.
      setApiError(message);
      await notify('Login failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  // Handle the "Continue with Google" button.
  async function handleGoogleLogin() {
    if (busy) return;
    setApiError('');
    setGoogleLoading(true);

    try {
      const result = await loginWithGoogle();

      if (result.status === 'cancelled') return;

      if (result.status === 'needsProfile') {
        // New person: ask for the mobile number to finish signing up.
        router.push({
          pathname: '/(auth)/complete-google-profile',
          params: {
            googleSignupToken: result.googleSignupToken,
            name: result.profile?.name ?? '',
            email: result.profile?.email ?? '',
            picture: result.profile?.picture ?? '',
          },
        });
        return;
      }

      await notify(
        'Login successful',
        `Welcome back, ${result.user?.name ?? 'rider'}!`
      );
      router.replace(DASHBOARD_ROUTE);
    } catch (error) {
      const message = getErrorMessage(error);
      setApiError(message);
      await notify('Google sign-in failed', message);
    } finally {
      setGoogleLoading(false);
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
          style={styles.forgot}
          onPress={() =>
            router.push({
              pathname: '/(auth)/forgot-password',
              params: { email: email.trim().toLowerCase() },
            })
          }
          disabled={submitting}
        >
          <Text style={styles.link}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={busy}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Log in</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, busy && styles.buttonDisabled]}
          onPress={handleGoogleLogin}
          disabled={busy}
          activeOpacity={0.8}
          accessibilityLabel="Continue with Google"
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>

          <TouchableOpacity
            onPress={() => router.push('/(auth)/signup-email')}
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
  forgot: { alignSelf: 'flex-end', marginTop: 10, paddingVertical: 4 },
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

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },

  dividerText: {
    marginHorizontal: 12,
    color: colors.textMuted,
  },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 20,
  },

  googleButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
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
