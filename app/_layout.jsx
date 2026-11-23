import { Stack } from 'expo-router';

import { AuthProvider } from '../context/authContext';
import { NotificationProvider } from '../context/notificationContext';
import { RouteProvider } from '../context/RouteContext';
import { VehicleProvider } from '../context/VehicleContext';

const RootLayout = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <RouteProvider>
          <VehicleProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(dashbord)" />
            </Stack>
          </VehicleProvider>
        </RouteProvider>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default RootLayout;