// Import useState so the screen can remember what the user types
import { useState } from 'react';
// Import the React Native building blocks used on this screen
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
// Import your palette
import { colors } from '../theme/colors';
// Import the auth hook to get the login function
import { useAuth } from '../context/authContext';
// Import the helper that turns API errors into readable messages
import { getErrorMessage } from '../api/client';

// The Login screen; "navigation" is provided automatically by React Navigation
export default function LoginScreen({ navigation }) {
  // Get the login function from AuthContext
  const { login } = useAuth();

  // Text typed into the email box
  const [email, setEmail] = useState('');
  // Text typed into the password box
  const [password, setPassword] = useState('');
  // Validation messages for each field, for example { email: 'Enter a valid email' }
  const [errors, setErrors] = useState({});
  // Message returned by the server, for example "Invalid credentials"
  const [apiError, setApiError] = useState('');
  // True while the login request is running (shows a spinner and disables the button)
  const [submitting, setSubmitting] = useState(false);

  // Check the form values and return an object of error messages (empty means valid)
  function validate() {
    // Start with no errors
    const e = {};
    // Email must not be empty
    if (!email.trim()) e.email = 'Email is required.';
    // Email must look like name@domain.com
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'Enter a valid email address.';
    // Password must not be empty
    if (!password) e.password = 'Password is required.';
    // Give the errors back to the caller
    return e;
  }

  // Runs when the user taps the Log in button
  async function handleLogin() {
    // Clear any old server message
    setApiError('');
    // Check the form first
    const e = validate();
    // Show the field errors
    setErrors(e);
    // Stop here if there is any error, so no request is sent
    if (Object.keys(e).length > 0) return;

    // Start the loading state
    setSubmitting(true);
    try {
    // Lowercase the email so it matches how the service stores it
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      // Show a readable message from the server or the network
      setApiError(getErrorMessage(err));
    } finally {
      // Stop the loading state whether it worked or failed
      setSubmitting(false);
    }
  }

  return (
    // Moves the form up when the keyboard opens so inputs are not hidden
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Lets the form scroll on small screens; keeps taps working while the keyboard is open */}
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Screen title */}
        <Text style={styles.title}>Welcome back</Text>
        {/* Short subtitle under the title */}
        <Text style={styles.subtitle}>Log in to continue with Share-Ride</Text>

        {/* Server error box, shown only when there is a server message */}
        {apiError ? <Text style={styles.apiError}>{apiError}</Text> : null}

        {/* Label above the email input */}
        <Text style={styles.label}>Email</Text>
        <TextInput
          // Red border when this field has an error, normal border otherwise
          style={[styles.input, errors.email && styles.inputError]}
          // Hint text shown while the box is empty
          placeholder="you@example.com"
          // Value comes from state
          value={email}
          // Update state each time the user types
          onChangeText={setEmail}
          // Show the email keyboard with the @ key
          keyboardType="email-address"
          // Do not capitalise the first letter
          autoCapitalize="none"
          // Do not auto-correct email addresses
          autoCorrect={false}
        />
        {/* Validation message for the email field */}
        {errors.email ? <Text style={styles.fieldError}>{errors.email}</Text> : null}

        {/* Label above the password input */}
        <Text style={styles.label}>Password</Text>
        <TextInput
          // Red border when this field has an error
          style={[styles.input, errors.password && styles.inputError]}
          // Hint text
          placeholder="Your password"
          // Value comes from state
          value={password}
          // Update state each time the user types
          onChangeText={setPassword}
          // Hide the characters as dots so the password is never displayed
          secureTextEntry
          // Do not capitalise the first letter
          autoCapitalize="none"
        />
        {/* Validation message for the password field */}
        {errors.password ? <Text style={styles.fieldError}>{errors.password}</Text> : null}

        {/* The main button; dimmed and disabled while a request is running */}
        <TouchableOpacity
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={submitting}
        >
          {/* Spinner while loading, button text otherwise */}
          {submitting ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Log in</Text>
          )}
        </TouchableOpacity>

        {/* Row with a link to the Register screen */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          {/* Go to the Register screen (its name is set in the navigator later) */}
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Styles for this screen
const styles = StyleSheet.create({
  // Fills the whole screen and uses the lavender background
  flex: { flex: 1, backgroundColor: colors.background },
  // Centres the form vertically with padding around it
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  // Large indigo heading
  title: { fontSize: 28, fontWeight: 'bold', color: colors.secondary },
  // Smaller grey-purple text under the heading
  subtitle: { fontSize: 15, color: colors.text, marginTop: 4, marginBottom: 24 },
  // Small label above each input
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  // White rounded input box with a soft border
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
  // Red border used when a field has an error
  inputError: { borderColor: colors.error },
  // Small red text under a field
  fieldError: { color: colors.error, fontSize: 13, marginTop: 4 },
  // Red message box for server errors
  apiError: {
    color: colors.error,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  // Big indigo button
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  // Faded look while the button is disabled
  buttonDisabled: { opacity: 0.6 },
  // White bold text inside the button
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  // Puts "Don't have an account?" and "Register" on one line
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  // Normal footer text
  footerText: { color: colors.text },
  // Violet-indigo bold link text
  link: { color: colors.primary, fontWeight: 'bold' },
});