import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({
    visible: false,
    type: 'info', // 'success' | 'error' | 'warning' | 'info'
    title: '',
    message: '',
  });

  const lastNotificationRef = useRef({ message: '', timestamp: 0 });
  const timeoutRef = useRef(null);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback(({ type = 'info', title = '', message = '', duration = 3500 }) => {
    // Deduplication check: ignore identical notifications within 2 seconds
    const now = Date.now();
    const normalizedKey = `${type}:${title}:${message}`;
    if (
      lastNotificationRef.current.key === normalizedKey &&
      now - lastNotificationRef.current.timestamp < 2000
    ) {
      return;
    }
    lastNotificationRef.current = { key: normalizedKey, timestamp: now };

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setToast({
      visible: true,
      type,
      title,
      message,
    });

    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    }
  }, [hideToast]);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
