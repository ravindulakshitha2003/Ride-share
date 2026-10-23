// Import the spinner and layout tools for the loading screen
import { ActivityIndicator, StyleSheet, View } from 'react-native';
// Import the container that powers all navigation in the app
import { NavigationContainer } from '@react-navigation/native';
// Import the function that creates a stack of screens (a new screen slides over the previous one)
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// Import your palette
import { colors } from '../theme/colors';
// Import the auth hook to know whether someone is logged in
import { useAuth } from '../context/authContext';
// Import the three screens you built
import LoginScreen from '../screens/loginScreen';
import RegisterScreen from '../screens/registerScreen';
import ProfileScreen from '../screens/profileScreen';

// Create the stack navigator (it gives us Stack.Navigator and Stack.Screen)
const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  // user is null when logged out; loading is true while the saved session is being checked
  const { user, loading } = useAuth();

  // While the app checks for a saved session, show a spinner instead of flashing the Login screen
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    // Wrap everything in the navigation container (needed once at the top)
    <NavigationContainer>
      {/* Default look for every screen's header bar */}
      <Stack.Navigator
        screenOptions={{
          // Indigo header background
          headerStyle: { backgroundColor: colors.primary },
          // White back arrow and title
          headerTintColor: colors.white,
          // Bold title text
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {user ? (
          // Logged in: the only screen available is Profile (more app screens will join it later)
          <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My profile' }} />
        ) : (
          // Logged out: only Login and Register exist, so unauthenticated users can never reach Profile
          <>
            {/* Login has its own title, so hide the header bar */}
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            {/* Register keeps the header so the user gets a back arrow to Login */}
            <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Styles for the loading screen
const styles = StyleSheet.create({
  // Fills the screen, centres the spinner, uses the lavender background
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
});