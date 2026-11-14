import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.log('Notification handler failed:', e?.message);
}

let notificationsReady = false;

export async function setupNotifications() {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Share-Ride',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    notificationsReady = true;
  } catch (e) {
    // Expo Go limitation: fall back to Alert below
    console.log('Notification setup failed:', e?.message);
    notificationsReady = false;
  }
}

export async function notify(title, body) {
  try {
    if (!notificationsReady) throw new Error('not ready');

    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch (e) {
    Alert.alert(title, body);
  }
}