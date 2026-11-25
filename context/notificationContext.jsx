import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getNotifications, markNotificationRead } from "../api/notifications";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const refresh = useCallback(async () => {
    try {
      setNotifications(await getNotifications());
    } catch (error) {
      console.warn("Failed to load notifications:", error.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.warn("Failed to mark as read:", error.message);
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const value = { notifications, unreadCount, refresh, markRead, markAllRead };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used inside NotificationProvider");
  }
  return context;
}