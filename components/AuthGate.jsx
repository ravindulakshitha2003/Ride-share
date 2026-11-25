// components/AuthGate.jsx
// ---------------------------------------------------------------------------
// AUTH GATE - protects any screen / layout that needs a logged-in user.
//
// HOW IT WORKS
//   1. AuthProvider (context/authContext.jsx) reads the saved token from
//      SecureStore when the app starts and calls GET /api/auth/me.
//      While that is happening `loading` is true.
//   2. If the token is valid  -> `user` is filled   -> we show the screen.
//      If there is no token / it is expired -> `user` stays null
//      -> we <Redirect> to the login page.
//
// USAGE
//   // wrap a whole folder (put it in that folder's _layout.jsx)
//   <AuthGate><Tabs /></AuthGate>
//
//   // or wrap a single screen
//   export default function Screen() {
//     return <AuthGate><ScreenContent /></AuthGate>;
//   }
//
//   // optional: only some roles may enter ('driver' / 'passenger')
//   <AuthGate allowedRoles={['driver']}> ... </AuthGate>
//
// IMPORTANT: never wrap the (auth) folder with this, or the login page
// would redirect to itself forever.
// ---------------------------------------------------------------------------
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import useAuth from '../hooks/useAuth';
import { colors } from '../theme/colors';

export default function AuthGate({
  children,
  redirectTo = '/login', // file app/(auth)/login.jsx -> URL "/login"
  allowedRoles, // optional array of roles that may see the children
}) {
  console.log(allowedRoles);
  const { user, loading } = useAuth();

  // 1. Still checking the saved token -> show a spinner.
  //    (Do NOT redirect yet, otherwise a logged-in user would flash the
  //    login page every time the app opens.)
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // 2. Not logged in -> go to login.
  //    `replace` (what <Redirect> does) removes this screen from history, so
  //    the back button cannot return to a protected page.
  if (!user) {
    return <Redirect href={redirectTo} />;
  }

  // 3. (optional) Logged in but wrong role -> go to the home route.
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Redirect href="/" />;
  }

  // 4. Logged in -> render the protected screen.
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});