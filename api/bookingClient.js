import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY } from './client';

// Booking service runs directly on port 5001 (no Nginx needed)
export const BOOKING_BASE_URL = 'http://192.168.8.159:5001';

const bookingClient = axios.create({
  baseURL: BOOKING_BASE_URL,
  timeout: 15000,
});

// Helper to extract user ID from JWT token payload
function getUserIdFromToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = typeof atob === 'function' ? atob(base64) : null;
    if (!decoded) return null;
    const parsed = JSON.parse(decoded);
    return parsed.sub || parsed.id || parsed.userId || null;
  } catch (err) {
    return null;
  }
}

// Token & Identity headers injection
bookingClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    const userId = getUserIdFromToken(token);
    if (userId) {
      config.headers['x-passenger-id'] = userId;
      config.headers['x-user-id'] = userId;
    }
  }
  return config;
});

export function getBookingErrorMessage(error) {
  const status = error.response?.status;

  if (status === 401 || status === 403) {
    return 'Your session has expired. Please log in again.';
  }

  if (status === 409) {
    return error.response?.data?.message || 'Booking conflict. Please try again.';
  }

  if (error.response?.data) {
    const { message, errors } = error.response.data;
    if (Array.isArray(errors) && errors.length > 0) {
      return `${message}: ${errors.map((e) => e.message).join(', ')}`;
    }
    if (message) return message;
    return `Server error ${status}`;
  }

  if (error.code === 'ECONNABORTED') {
    return 'Request timed out. Check your connection and try again.';
  }

  if (error.request) {
    return `Cannot reach the booking server at ${BOOKING_BASE_URL}. Check your Wi-Fi and that the backend is running.`;
  }

  return error.message || 'Something went wrong. Please try again.';
}

export default bookingClient;