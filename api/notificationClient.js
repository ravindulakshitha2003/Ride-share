
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { TOKEN_KEY } from './client';

// Notification Service - Port 4003
export const NOTIFICATION_BASE_URL =
  'http://localhost:4003';

const notificationClient = axios.create({
  baseURL: NOTIFICATION_BASE_URL,
  timeout: 15000,
});

// Automatically attach existing JWT token
notificationClient.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  }
);

export default notificationClient;
