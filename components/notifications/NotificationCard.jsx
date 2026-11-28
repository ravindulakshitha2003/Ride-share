
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function getNotificationStyle(type = '') {
  if (type.startsWith('ride.')) {
    return {
      icon: 'car-outline',
      color: '#6256D9',
      background: '#EFEDFF',
    };
  }

  if (type.startsWith('booking.')) {
    return {
      icon: 'calendar-outline',
      color: '#16865B',
      background: '#E7F7EF',
    };
  }

  if (type.startsWith('payment.')) {
    return {
      icon: 'wallet-outline',
      color: '#D28A19',
      background: '#FFF5E3',
    };
  }

  return {
    icon: 'notifications-outline',
    color: '#64748B',
    background: '#F1F5F9',
  };
}

function getTimeAgo(date) {
  if (!date) return '';

  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) return '';

  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString();
}

export default function NotificationCard({
  item,
  onPress,
  onViewRide,
}) {
  if (!item) return null;

  const notificationStyle = getNotificationStyle(item.type);
  const isUnread = !item.readAt;

  const origin = item.data?.origin;
  const destination = item.data?.destination;
  const rideId = item.data?.rideId;
  const requestedSeats = item.data?.requestedSeats;

  // Identify driver booking request notifications.
  const isDriverBookingRequest =
    item.type === 'booking.created' &&
    item.title === 'New Booking Request';

  const handleBookingAction = (action) => {
    Alert.alert(
      `${action} Booking`,
      `${action} is not connected to the backend yet.`
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress?.(item)}
      style={[
        styles.card,
        isUnread && styles.unreadCard,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: notificationStyle.background },
        ]}
      >
        <Ionicons
          name={notificationStyle.icon}
          size={23}
          color={notificationStyle.color}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title || 'Notification'}
          </Text>

          {isUnread && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.body}>
          {item.body || ''}
        </Text>

        {origin && destination && (
          <View style={styles.routeContainer}>
            <View style={styles.routeRow}>
              <Ionicons
                name="location-outline"
                size={15}
                color="#6256D9"
              />
              <Text style={styles.routeText} numberOfLines={1}>
                {origin}
              </Text>
            </View>

            <View style={styles.routeRow}>
              <Ionicons
                name="flag-outline"
                size={15}
                color="#16A36A"
              />
              <Text style={styles.routeText} numberOfLines={1}>
                {destination}
              </Text>
            </View>
          </View>
        )}

        {isDriverBookingRequest && (
          <View style={styles.bookingInfo}>
            <Ionicons
              name="people-outline"
              size={16}
              color="#6256D9"
            />

            <Text style={styles.bookingInfoText}>
              {requestedSeats ?? 0}{' '}
              {requestedSeats === 1 ? 'seat' : 'seats'} requested
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.time}>
            {getTimeAgo(item.createdAt)}
          </Text>

          {rideId && (
            <TouchableOpacity
              onPress={() => onViewRide?.(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewRide}>
                View ride
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isDriverBookingRequest && (
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.acceptButton}
              activeOpacity={0.8}
              onPress={() => handleBookingAction('Accept')}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={17}
                color="#FFFFFF"
              />
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.rejectButton}
              activeOpacity={0.8}
              onPress={() => handleBookingAction('Reject')}
            >
              <Ionicons
                name="close-circle-outline"
                size={17}
                color="#DC4545"
              />
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 15,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF0F5',
  },

  unreadCard: {
    backgroundColor: '#F8F7FF',
    borderColor: '#E2DEFF',
  },

  iconContainer: {
    width: 45,
    height: 45,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  content: {
    flex: 1,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#202437',
    marginRight: 8,
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6256D9',
    marginTop: 5,
  },

  body: {
    fontSize: 13,
    lineHeight: 19,
    color: '#687084',
    marginTop: 5,
  },

  routeContainer: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F7F8FC',
    borderRadius: 10,
    gap: 7,
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  routeText: {
    flex: 1,
    fontSize: 12,
    color: '#42495A',
  },

  bookingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 12,
  },

  bookingInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6256D9',
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  time: {
    fontSize: 11,
    color: '#9299A8',
  },

  viewRide: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6256D9',
  },

  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16865B',
    paddingVertical: 11,
    borderRadius: 10,
  },

  acceptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF0F0',
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5D1D1',
  },

  rejectText: {
    color: '#DC4545',
    fontSize: 13,
    fontWeight: '700',
  },
});
