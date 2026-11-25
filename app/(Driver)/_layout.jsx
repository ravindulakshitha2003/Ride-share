import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';
import { useNotifications } from '../../context/notificationContext';
import { AuthProvider } from '../../context/authContext';
import AuthGate from '../../components/AuthGate';
import DriverAccess from '../driver-access';

export default function DashboardLayout() {
  const { unreadCount } = useNotifications();

  return (
    <AuthProvider>
      <AuthGate allowedRoles={['driver']}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.secondary,

            tabBarStyle: {
              position: 'absolute',
              bottom: 14,
              left: 16,
              right: 16,
              height: 72,
              paddingTop: 9,
              paddingBottom: 9,
              paddingHorizontal: 8,
              backgroundColor: colors.white,
              borderRadius: 24,
              borderTopWidth: 0,
              borderWidth: 1,
              borderColor: colors.border,
              elevation: 10,
              shadowColor: colors.secondary,
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
            },

            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '700',
              marginTop: 3,
            },

            tabBarItemStyle: {
              borderRadius: 16,
              paddingVertical: 2,
            },

            tabBarHideOnKeyboard: true,
          }}
        >
          {/* My Rides */}
          <Tabs.Screen
            name="Addvehical"
            options={{
              title: 'Addvehical',
              tabBarIcon: ({ focused, color }) => (
             
                <Ionicons
                  name={focused ? 'add-circle' : 'add-circle-outline'}
                  size={25}
                  color={color}
                />
              ),
            }}
          />


  
          

          {/* vehical details */}
          <Tabs.Screen
            name="Vehicle"
            options={{
              title: 'Vehicle',
              tabBarIcon: ({ focused, color }) => (
                <Ionicons
                  name={
                    focused
                      ? 'car'
                      : 'car-outline'
                  }
                  size={25}
                  color={color}
                />
              ),
            }}
          />
         
          {/* Publish Ride */}
          <Tabs.Screen
            name="publish-ride"
            options={{
              title: 'Publish Ride',
              tabBarIcon: ({ focused, color }) => (
                <Ionicons
                  name={
                    focused
                      ? 'add-circle'
                      : 'add-circle-outline'
                  }
                  size={25}
                  color={color}
                />
              ),
            }}
          />

          {/* Hidden screen - still navigable */}
          
        </Tabs>
    </AuthGate>
    </AuthProvider>
  );
}