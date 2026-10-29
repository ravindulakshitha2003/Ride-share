
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function DashboardLayout() {
  return (
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
      

      <Tabs.Screen
        name="rideDetailsScreen"
        options={{
          title: 'My Rides',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? 'car' : 'car-outline'}
              size={25}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="resultsScreen"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={
                focused
                  ? 'compass'
                  : 'compass-outline'
              }
              size={25}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={
                focused
                  ? 'person-circle'
                  : 'person-circle-outline'
              }
              size={25}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
