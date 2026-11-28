
import { useCallback, useEffect, useState } from 'react';

import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [error, setError] = useState(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Fetch notifications and unread count
  const loadNotifications = useCallback(async () => {
    try {
      setError(null);

      const [notificationResult, countResult] =
        await Promise.all([
          fetchNotifications(1, 20),
          fetchUnreadCount(),
        ]);

      setNotifications(notificationResult.notifications || []);
      setPagination(
        notificationResult.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        }
      );

      setUnreadCount(countResult);
    } catch (err) {
      console.error(
        'Notification loading failed:',
        err.response?.data || err.message
      );

      setError(
        err.response?.data?.message ||
        'Unable to load notifications. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial loading
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Pull-to-refresh
  const refreshNotifications = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [loadNotifications]);

  // Load next page
  const loadMoreNotifications = useCallback(async () => {
    if (
      loadingMore ||
      loading ||
      pagination.page >= pagination.totalPages
    ) {
      return;
    }

    const nextPage = pagination.page + 1;

    setLoadingMore(true);

    try {
      const result = await fetchNotifications(nextPage, 20);

      setNotifications((previous) => {
        const existingIds = new Set(
          previous.map((item) => item._id)
        );

        const newItems = (result.notifications || []).filter(
          (item) => !existingIds.has(item._id)
        );

        return [...previous, ...newItems];
      });

      setPagination(result.pagination);
    } catch (err) {
      console.error('Loading more notifications failed:', err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, pagination]);

  // Mark one notification as read
  const markRead = useCallback(async (notificationId) => {
    const notification = notifications.find(
      (item) => item._id === notificationId
    );

    if (!notification || notification.readAt) {
      return;
    }

    try {
      await markNotificationAsRead(notificationId);

      const readAt = new Date().toISOString();

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === notificationId
            ? { ...item, readAt }
            : item
        )
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (err) {
      console.error(
        'Mark notification as read failed:',
        err.response?.data || err.message
      );

      throw err;
    }
  }, [notifications]);

  // Mark all notifications as read
  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;

    try {
      await markAllNotificationsAsRead();

      const readAt = new Date().toISOString();

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          readAt: item.readAt || readAt,
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error(
        'Mark all notifications as read failed:',
        err.response?.data || err.message
      );

      throw err;
    }
  }, [unreadCount]);

  return {
    notifications,
    unreadCount,

    loading,
    refreshing,
    loadingMore,
    error,

    pagination,

    loadNotifications,
    refreshNotifications,
    loadMoreNotifications,

    markRead,
    markAllRead,
  };
}
