import React, {
  createContext,
  useCallback,
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

// Your API returns { user: {...} }. This also supports Axios-style
// responses if your API functions return response.data or response.
function extractUser(response) {
  const payload = response?.data ?? response;
  return payload?.user ?? payload;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch the latest authenticated user from the backend.
  const refreshUser = useCallback(async () => {
    const response = await getMe();
    const currentUser = extractUser(response);

    if (!currentUser?.id && !currentUser?._id) {
      throw new Error('The profile response did not contain a user.');
    }

    setUser(currentUser);
    return currentUser;
  }, []);

  // Restore the session when the app starts.
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);

        if (savedToken) {
          const response = await getMe();
          const currentUser = extractUser(response);

          if (!currentUser?.id && !currentUser?._id) {
            throw new Error('Invalid profile response.');
          }

          if (mounted) {
            setUser(currentUser);
          }
        }
      } catch (error) {
        console.error('Session restoration failed:', error);

        try {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        } catch (storageError) {
          console.error('Could not clear saved token:', storageError);
        }

        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Login and store the authentication token.
  async function login(email, password) {
    const response = await loginUser({ email, password });
    const data = response?.data ?? response;
    const authToken = data?.token ?? data?.accessToken;

    if (!authToken) {
      throw new Error('Login failed: no token received.');
    }

    await SecureStore.setItemAsync(TOKEN_KEY, authToken);

    try {
      // Prefer the user returned by login; otherwise request /me.
      const currentUser = data?.user
        ? data.user
        : await refreshUser();

      setUser(currentUser);
      return currentUser;
    } catch (error) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      setUser(null);
      throw error;
    }
  }

  // Register a user. Set autoLogin=true if registration returns a token.
  async function register(form, autoLogin = false) {
    const response = await registerUser(form);
    const data = response?.data ?? response;
    const authToken = data?.token ?? data?.accessToken;

    if (autoLogin && authToken) {
      await SecureStore.setItemAsync(TOKEN_KEY, authToken);

      try {
        const currentUser = data?.user
          ? data.user
          : await refreshUser();
      

        setUser(currentUser);
        return currentUser;
      } catch (error) {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        setUser(null);
        throw error;
      }
    }

    return data;
  }

  async function logout() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setUser(null);
  }

  async function token() {
    return SecureStore.getItemAsync(TOKEN_KEY);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        token,
        login,
        register,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
