
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'access_token';

const BASE_URL = 'http://192.168.1.8:4001';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getErrorMessage(error) {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (error.request) {
    return 'Cannot reach the server. Check your connection and try again.';
  }

  return error.message || 'Something went wrong. Please try again.';
}

export default client;
