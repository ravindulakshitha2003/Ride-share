// Import the status bar component that Expo provides
import { StatusBar } from 'expo-status-bar';
// Import the provider that gives every screen access to the user, login, register and logout
import { AuthProvider } from './src/context/authContext';
// Import the navigator that decides which screens to show
import RootNavigator from './src/navigation/rootNavigator';

export default function App() {
  return (
    // The provider must wrap the navigator so all screens can call useAuth()
    <AuthProvider>
      {/* The screens of the app */}
      <RootNavigator />
      {/* Automatically light or dark status bar text */}
      <StatusBar style="auto" />
    </AuthProvider>
  );
}