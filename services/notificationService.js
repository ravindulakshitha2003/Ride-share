
import notificationClient from '../api/notificationClient';

// 1. Get all notifications
export async function fetchNotifications(page = 1, limit = 20) {
  const response = await notificationClient.get(
    '/api/notifications',
    {
      params: { page, limit },
    }
  );

  return response.data;
}

// 2. Get unread notifications
export async function fetchUnreadNotifications() {
  const response = await notificationClient.get(
    '/api/notifications/unread'
  );

  return response.data;
}

// 3. Get unread notification count
export async function fetchUnreadCount() {
  const response = await notificationClient.get(
    '/api/notifications/unread-count'
  );

  return response.data.unreadCount;
}

// 4. Mark one notification as read
export async function markNotificationAsRead(id) {
  const response = await notificationClient.patch(
    `/api/notifications/${id}/read`
  );

  return response.data;
}

// 5. Mark all notifications as read
export async function markAllNotificationsAsRead() {
  const response = await notificationClient.patch(
    '/api/notifications/read-all'
  );

  return response.data;
}
