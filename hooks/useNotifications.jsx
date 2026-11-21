import { useState, useEffect, useCallback } from 'react';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../api/notificationApi';

export function useNotifications(pollIntervalMs = 15000) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadNotifications = useCallback(async () => {
    try {
      setError(null);
      const [listRes, countRes] = await Promise.all([
        getNotifications(1, 30),
        getUnreadNotificationCount(),
      ]);

      if (listRes?.success) {
        setNotifications(listRes.notifications || []);
      }
      if (countRes?.success) {
        setUnreadCount(countRes.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err?.message || err);
      setError(err?.response?.data?.message || 'Could not load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (id) => {
    try {
      // Optimistic UI update
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await markNotificationAsRead(id);
    } catch (err) {
      console.error('Error marking notification as read:', err);
      loadNotifications(); // Rollback if error
    }
  };

  const markAllAsRead = async () => {
    try {
      // Optimistic UI update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);

      await markAllNotificationsAsRead();
    } catch (err) {
      console.error('Error marking all as read:', err);
      loadNotifications();
    }
  };

  useEffect(() => {
    loadNotifications();

    if (pollIntervalMs > 0) {
      const timer = setInterval(loadNotifications, pollIntervalMs);
      return () => clearInterval(timer);
    }
  }, [loadNotifications, pollIntervalMs]);

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh: onRefresh,
    markAsRead,
    markAllAsRead,
  };
}