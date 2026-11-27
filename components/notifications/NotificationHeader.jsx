
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const INDIGO = '#352F87';
const MUTED = '#777394';
const VIOLET = '#5B4BDB';

export default function NotificationHeader({
  unreadCount = 0,
  onMarkAllRead,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Notifications</Text>

        {unreadCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.subtitle}>
          Stay updated with your journeys
        </Text>

        <TouchableOpacity
          style={[
            styles.markButton,
            unreadCount === 0 && styles.disabledButton,
          ]}
          onPress={onMarkAllRead}
          disabled={unreadCount === 0}
          activeOpacity={0.7}
          accessibilityLabel="Mark all notifications as read"
        >
          <MaterialCommunityIcons
            name="check-all"
            size={18}
            color={unreadCount > 0 ? VIOLET : '#AAA7BD'}
          />

          <Text
            style={[
              styles.markText,
              unreadCount === 0 && styles.disabledText,
            ]}
          >
            Mark all read
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },

  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: INDIGO,
  },

  countBadge: {
    backgroundColor: VIOLET,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },

  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  subtitle: {
    fontSize: 13,
    color: MUTED,
  },

  markButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 10,
    backgroundColor: '#EEEBFF',
  },

  disabledButton: {
    backgroundColor: '#F1F0F5',
  },

  markText: {
    fontSize: 12,
    fontWeight: '700',
    color: VIOLET,
  },

  disabledText: {
    color: '#AAA7BD',
  },
});
