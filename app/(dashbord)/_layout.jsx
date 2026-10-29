
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export default function DashboardLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          position: 'absolute',
          bottom: 12,
          left: 0,
          right: 0,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
          marginHorizontal: 12,

          backgroundColor: colors.white,
          borderRadius: 22,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,

          elevation: 8,
          shadowColor: colors.secondary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },

        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.secondary,

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },

        tabBarItemStyle: {
          paddingVertical: 1,
        },

        tabBarHideOnKeyboard: true,
      }}
    >
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
