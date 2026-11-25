import { Stack } from 'expo-router';

import { AuthProvider } from '../context/authContext';
import { NotificationProvider } from '../context/notificationContext';
import { RouteProvider } from '../context/RouteContext';
import { VehicleProvider } from '../context/VehicleContext';
import { ToastProvider } from '../context/ToastContext';
import Toast from '../components/common/Toast';

const RootLayout = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RouteProvider>
          <VehicleProvider>
            <ToastProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(dashbord)" />
              </Stack>
              <Toast />
            </ToastProvider>
          </VehicleProvider>
        </RouteProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default RootLayout;