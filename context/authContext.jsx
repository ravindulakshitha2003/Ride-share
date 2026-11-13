
import {
  createContext,
  useEffect,
  useState,
} from 'react';

import * as SecureStore from 'expo-secure-store';

import { TOKEN_KEY } from '../api/client';
import {
  getMe,
  loginUser,
  registerUser,
} from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore an existing login session when the app starts.
  useEffect(() => {
    async function restoreSession() {
      try {
        const token = await SecureStore.getItemAsync(
          TOKEN_KEY
        );

        if (token) {
          const profile = await getMe();
          setUser(profile);
        }
      } catch (error) {
        try {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        } catch (storageError) {
          console.error(
            'Could not clear saved token:',
            storageError
          );
        }

        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  // Log in and save the authentication token.
  async function login(email, password) {
    const data = await loginUser({
      email,
      password,
    });

    const token = data.token ?? data.accessToken;

    if (!token) {
      throw new Error(
        'Login failed: no token received.'
      );
    }

    await SecureStore.setItemAsync(TOKEN_KEY, token);

    try {
      const profile = data.user ?? await getMe();

      setUser(profile);

      return profile;
    } catch (error) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      throw error;
    }
  }

  // Register a new account.
  async function register(form) {
    return registerUser(form);
  }

  // Log out and remove the saved token.
  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
