import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { TOKEN_KEY } from './client';

// Ride service (route-matching). Auth + vehicles stay on 4001 in ./client.
export const RIDE_BASE_URL = 'http://192.168.8.159:4002';

const rideClient = axios.create({
  baseURL: RIDE_BASE_URL,
  timeout: 15000,
});

// Same token injection as ./client
rideClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getRideErrorMessage(error) {
  const status = error.response?.status;

  if (status === 401 || status === 403) {
    return 'Your session has expired. Please log in again.';
  }

  if (error.response?.data) {
    const { message, fields } = error.response.data;

    if (Array.isArray(fields) && fields.length > 0) {
      return `${message}: ${fields.join(', ')}`;
    }

    if (message) return message;
    return `Server error ${status}`;
  }

  if (error.code === 'ECONNABORTED') {
    return 'The request timed out. Check your connection and try again.';
  }

  if (error.request) {
    return `Cannot reach the ride server at ${RIDE_BASE_URL}. Check your Wi-Fi and that the backend is running.`;
  }

  return error.message || 'Something went wrong. Please try again.';
}

export default rideClient;