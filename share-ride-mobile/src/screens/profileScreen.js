// Import useEffect to run code when the screen opens, and useState to remember data
import { useCallback, useEffect, useState } from 'react';
// Import the React Native building blocks used on this screen
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Import your palette
import { colors } from '../theme/colors';
// Import the auth hook to get the logout function
import { useAuth } from '../context/authContext';
// Import the GET /me call you wrote in auth.js
import { getMe } from '../api/auth';
// Import the helper that turns API errors into readable messages
import { getErrorMessage } from '../api/client';

// One row on the screen: a small grey label with the value underneath
function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      {/* Small label such as "Email" */}
      <Text style={styles.rowLabel}>{label}</Text>
      {/* The value; shows a dash if the backend sent nothing */}
      <Text style={styles.rowValue}>{value || '-'}</Text>
    </View>
  );
}

// The Profile screen, shown after the user logs in
export default function ProfileScreen() {
  // Get the logout function from AuthContext
  const { logout } = useAuth();
  // The profile data returned by GET /me (null until it arrives)
  const [profile, setProfile] = useState(null);
  // True while the profile is being loaded
  const [loading, setLoading] = useState(true);
  // Error message if loading fails
  const [error, setError] = useState('');

  // Load the profile from the backend (wrapped so the Retry button can call it again)
  const loadProfile = useCallback(async () => {
    // Show the spinner and clear any old error
    setLoading(true);
    setError('');
    try {
      // Ask the backend for the logged-in user (the token is attached automatically)
      const me = await getMe();
      // Keep the result so the screen can show it
      setProfile(me);
    } catch (err) {
      // Show a readable message from the server or the network
      setError(getErrorMessage(err));
    } finally {
      // Hide the spinner whether it worked or failed
      setLoading(false);
    }
  }, []);

  // Load the profile once when the screen opens
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Ask for confirmation, then log out
  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      // Do nothing if the user cancels
      { text: 'Cancel', style: 'cancel' },
      // Clear the token and user; the app then shows the Login screen
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  }

  // While loading, show a centred spinner
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // If loading failed, show the message with a Retry button and a Log out button
  if (error) {
    return (
      <View style={styles.center}>
        {/* The error message */}
        <Text style={styles.error}>{error}</Text>
        {/* Try loading the profile again */}
        <TouchableOpacity style={styles.button} onPress={loadProfile}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
        {/* Let the user leave even when the profile cannot load */}
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.link}>Log out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // The backend may send roles as a list (["passenger", "driver"]) or as a single role
  const roleText = Array.isArray(profile?.roles) ? profile.roles.join(', ') : profile?.role;
  // Use the first letter of the name for the avatar circle
  const initial = (profile?.fullName || profile?.name || '?').charAt(0).toUpperCase();

  return (
    // Scrollable page with the lavender background
    <ScrollView style={styles.page} contentContainerStyle={styles.container}>
      {/* Circle showing the first letter of the user's name */}
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      {/* The user's name as a heading */}
      <Text style={styles.name}>{profile?.fullName || profile?.name}</Text>

      {/* Card with the basic profile details; only these fields are shown, so a password or hash can never appear */}
      <View style={styles.card}>
        <InfoRow label="Email" value={profile?.email} />
        <InfoRow label="Mobile" value={profile?.mobile} />
        <InfoRow label="Role" value={roleText} />
      </View>

      {/* Logout button */}
      <TouchableOpacity style={styles.logout} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Styles for this screen
const styles = StyleSheet.create({
  // Full-screen lavender background
  page: { flex: 1, backgroundColor: colors.background },
  // Centres content horizontally with padding
  container: { alignItems: 'center', padding: 24 },
  // Centred layout used for the loading and error states
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
  // Round indigo avatar
  avatar: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  // Big white letter inside the avatar
  avatarText: { color: colors.white, fontSize: 36, fontWeight: 'bold' },
  // Name under the avatar
  name: { fontSize: 24, fontWeight: 'bold', color: colors.secondary, marginTop: 12, marginBottom: 24 },
  // White rounded card holding the rows
  card: {
    alignSelf: 'stretch', backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16,
  },
  // One row, separated from the next by a thin line
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  // Small grey label
  rowLabel: { fontSize: 13, color: colors.text, opacity: 0.6 },
  // The value text
  rowValue: { fontSize: 16, color: colors.text, marginTop: 2 },
  // Outlined logout button
  logout: {
    alignSelf: 'stretch', borderWidth: 1, borderColor: colors.error, borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 32,
  },
  // Red logout text
  logoutText: { color: colors.error, fontSize: 16, fontWeight: 'bold' },
  // Red error text
  error: { color: colors.error, textAlign: 'center', marginBottom: 16 },
  // Indigo button
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28, marginBottom: 16 },
  // White button text
  buttonText: { color: colors.white, fontWeight: 'bold' },
  // Indigo text link
  link: { color: colors.primary, fontWeight: 'bold' },
});