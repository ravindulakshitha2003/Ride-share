
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationEmptyState({
  title = 'You’re all caught up!',
  message = 'You don’t have any notifications right now.',
}) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons
          name="notifications-off-outline"
          size={42}
          color="#6256D9"
        />
      </View>

      <Text style={styles.title}>
        {title}
      </Text>

      <Text style={styles.message}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 35,
    paddingVertical: 55,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EFEDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202437',
    textAlign: 'center',
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    color: '#858B9B',
    textAlign: 'center',
    marginTop: 8,
  },
});