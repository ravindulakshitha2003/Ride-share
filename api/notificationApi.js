import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const TOKEN_KEY = 'access_token';

// ---------------------------------------------------------------------------
// Notification Service URL:
// - Physical phone on Wi-Fi: use your PC's LAN IP with port 4003
// - Android Emulator: '10.0.2.2'
// - iOS Simulator: 'localhost'
// ---------------------------------------------------------------------------
const SERVER_IP = '192.168.8.159'; // <-- Your PC Wi-Fi IP
const PORT = '4003';               // Notification backend port

const BASE_URL = `http://${SERVER_IP}:${PORT}/api/notifications`;

const notificationClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Automatically inject JWT Bearer token into outgoing requests
notificationClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 1. Get all notifications (paginated)
export async function getNotifications(page = 1, limit = 20) {
  const response = await notificationClient.get('/', {
    params: { page, limit },
  });
  return response.data;
}

// 2. Get unread count
export async function getUnreadNotificationCount() {
  const response = await notificationClient.get('/unread-count');
  return response.data;
}

// 3. Mark single notification as read
export async function markNotificationAsRead(notificationId) {
  const response = await notificationClient.patch(`/${notificationId}/read`);
  return response.data;
}

// 4. Mark all notifications as read
export async function markAllNotificationsAsRead() {
  const response = await notificationClient.patch('/read-all');
  return response.data;
}

export default notificationClient;