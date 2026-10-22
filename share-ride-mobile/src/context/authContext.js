// Import React tools: createContext shares data between screens, the others manage state and side effects
import { createContext, useContext, useEffect, useState } from 'react';
// Import secure storage, where the access token is kept on the phone
import * as SecureStore from 'expo-secure-store';
// Import the token label from client.js so every file uses the same one
import { TOKEN_KEY } from '../api/client';
// Import the three backend calls you wrote in auth.js
import { getMe, loginUser, registerUser } from '../api/auth';

// Create the shared "box" that will hold the auth data for the whole app
const AuthContext = createContext(null);

// This component wraps the app and provides the auth data to every screen inside it
export function AuthProvider({ children }) {
  // The logged-in user's profile (null means nobody is logged in)
  const [user, setUser] = useState(null);
  // True while the app is checking for a saved session on launch (used to show a loading screen)
  const [loading, setLoading] = useState(true);

  // Run once when the app opens, to restore a previous login
  useEffect(() => {
    // Define the restore logic as an async function
    async function restoreSession() {
      try {
        // Look for a saved token in secure storage
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        // If there is no token, nobody was logged in, so skip the rest
        if (!token) return;
        // Ask the backend who this token belongs to (GET /me)
        const me = await getMe();
        // Token is valid, so keep the user logged in
        setUser(me);
      } catch (e) {
        // Token is expired or invalid, so delete it and stay logged out
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setUser(null);
      } finally {
        // Checking is finished either way, so stop showing the loading screen
        setLoading(false);
      }
    }
    // Start the restore
    restoreSession();
  }, []);

  // Log the user in with email and password
  async function login(email, password) {
    // Send the credentials to the backend
    const data = await loginUser({ email, password });
    // Read the token from the reply (supports two common field names)
    const token = data.token ?? data.accessToken;
    // If the backend sent no token, treat it as a failure
    if (!token) throw new Error('Login failed: no token received.');
    // Save the token securely so the session survives app restarts
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    // Use the user from the reply, or fetch it with GET /me if the reply did not include one
    setUser(data.user ?? (await getMe()));
  }

  // Create a new account (does not log the user in; the screen sends them to Login afterwards)
  async function register(form) {
    // Send the registration form to the backend and return its reply
    return registerUser(form);
  }

  // Log the user out and clear the local session
  async function logout() {
    // Remove the saved token from secure storage
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    // Clear the user, which makes the app show the Login screen again
    setUser(null);
  }

  // Provide these values and functions to every screen inside the provider
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// A shortcut hook so screens can write: const { user, login } = useAuth();
export function useAuth() {
  // Read the shared auth data
  const ctx = useContext(AuthContext);
  // Warn clearly if a screen is used outside the provider
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  // Hand the data to the screen
  return ctx;
}