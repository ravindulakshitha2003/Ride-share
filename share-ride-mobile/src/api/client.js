// Import axios, the library we use to send HTTP requests to the backend
import axios from 'axios';
// Import everything from expo-secure-store, which saves data in the phone's encrypted storage
import * as SecureStore from 'expo-secure-store';

// The key name under which the access token is saved in secure storage (exported so other files reuse it)
export const TOKEN_KEY = 'access_token';

// Identity Service address: your computer's IP and port 4001 (no /api part)
const BASE_URL = 'http://192.168.1.8:4001';

/*// The backend address; use your computer's local IP (not localhost) and the port your backend runs on
const BASE_URL = 'http://192.168.1.10:5000/api';
*/

// Create one shared axios instance with default settings for every request
const client = axios.create({
  // Every request path is added after this base address
  baseURL: BASE_URL,
  // Give up and show an error if the server does not answer within 10 seconds
  timeout: 10000,
});

// Run this function before every request is sent
client.interceptors.request.use(async (config) => {
  // Read the saved token from secure storage (null if the user is not logged in)
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  // Only add the header when a token exists
  if (token) {
    // Tell the backend who is calling, using the standard Bearer format
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Return the (possibly updated) request so it continues to the server
  return config;
});

// Turn any axios error into a short message that is safe to show to the user
export function getErrorMessage(error) {
  // If the server replied with a message in its JSON body, show that message
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  // If the request was sent but no reply came back, the network or server is the problem
  if (error.request) {
    return 'Cannot reach the server. Check your connection and try again.';
  }
  // Anything else is an unexpected error, so show a generic message
  return 'Something went wrong. Please try again.';
}

// Export the client so other files can call client.get(...) and client.post(...)
export default client;