import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const TOKEN_KEY = 'access_token';

// ---------------------------------------------------------------------------
// Backend URL:
// - Physical phone on Wi-Fi: use your PC's LAN IP with port 4001 (or 8080 if using Nginx)
// - Android Emulator: 'http://10.0.2.2:4001'
// - iOS Simulator: 'http://localhost:4001'
// ---------------------------------------------------------------------------
const SERVER_IP = '192.168.8.159'; // <-- Replace with your current PC Wi-Fi IP
const PORT = '4001';             // Backend port (or 8080 if behind Nginx)

const BASE_URL = `http://${SERVER_IP}:${PORT}`;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s to allow Cloudinary image uploads
});

// Automatically inject JWT Bearer token into outgoing requests
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Enhanced error parser: displays backend validation messages & missing fields
export function getErrorMessage(error) {
  if (error.response?.data) {
    const { message, fields } = error.response.data;

    if (fields && Array.isArray(fields) && fields.length > 0) {
      return `${message}: ${fields.join(', ')}`;
    }

    if (message) return message;
  }

  if (error.request) {
    return `Cannot reach backend at ${BASE_URL}. Check your Wi-Fi connection and IP/port.`;
  }

  return error.message || 'Something went wrong. Please try again.';
}

export default client;