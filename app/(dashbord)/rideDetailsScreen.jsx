
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';
import { requestBooking } from '../../api/rides';
import { getErrorMessage } from '../../api/client';
import { formatDuration, friendlyDate } from '../../utils/date';

export default function RideDetailsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const [booking, setBooking] = useState(false);

  // Read and validate navigation parameters.
  const ride = route?.params?.ride;
  const passengers = Math.max(
    1,
    Number(route?.params?.passengers) || 1
  );

  // Prevent crashes when the ride was not passed correctly.
  if (!ride) {
    return (
      <View style={styles.errorPage}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.error}
        />
        <Text style={styles.errorTitle}>Ride details unavailable</Text>
        <Text style={styles.note}>
          Please return to the results and select a ride again.
        </Text>
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.bookText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const driver = ride.driver ?? {};
  const driverName = driver.name || 'Unknown driver';
  const initial = driverName.charAt(0).toUpperCase();
  const pricePerSeat = Number(ride.pricePerSeat);
  const total = (
    Number.isFinite(pricePerSeat) ? pricePerSeat : 0
  ) * passengers;

  const validDate = ride.date
    ? new Date(`${ride.date}T00:00:00`)
    : null;

  const dateText =
    validDate && !Number.isNaN(validDate.getTime())
      ? friendlyDate(validDate)
      : 'Date not available';

  async function handleBook() {
    const rideId = ride.id ?? ride._id;

    // Validate before sending the API request.
    if (!rideId) {
      Alert.alert('Booking failed', 'The ride ID is missing.');
      return;
    }

    if (!Number.isFinite(pricePerSeat) || pricePerSeat < 0) {
      Alert.alert('Booking failed', 'The ride price is invalid.');
      return;
    }

    if (booking) return;

    setBooking(true);

    try {
      await requestBooking({
        rideId,
        seats: passengers,
      });

      Alert.alert(
        'Request sent',
        'The driver will review your request. You will be notified when it is accepted.',
        [
          {
            text: 'OK',
            onPress: () => {
              // This assumes rideDetailsScreen is your My Rides tab.
              const parent = navigation.getParent();

              if (parent) {
                parent.navigate('rideDetailsScreen');
              } else {
                navigation.navigate('rideDetailsScreen');
              }
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Could not book', getErrorMessage(err));
    } finally {
      setBooking(false);
    }
  }

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.date}>{dateText}</Text>

        {/* Journey details */}
        <View style={styles.card}>
          <View style={styles.stop}>
            <Text style={styles.time}>
              {ride.departureTime || '--:--'}
            </Text>
            <View style={styles.dot} />
            <Text style={styles.place}>
              {ride.from || 'Starting location unavailable'}
            </Text>
          </View>

          <View style={styles.stop}>
            <Text style={styles.duration}>
              {Number.isFinite(Number(ride.durationMin))
                ? formatDuration(Number(ride.durationMin))
                : '--'}
            </Text>
            <View style={styles.bar} />
            <View style={styles.spacer} />
          </View>

          <View style={styles.stop}>
            <Text style={styles.time}>
              {ride.arrivalTime || '--:--'}
            </Text>
            <View style={[styles.dot, styles.dotEnd]} />
            <Text style={styles.place}>
              {ride.to || 'Destination unavailable'}
            </Text>
          </View>
        </View>

        {/* Price details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price</Text>

          <View style={styles.priceRow}>
            <Text style={styles.text}>
              Rs. {Number.isFinite(pricePerSeat) ? pricePerSeat : 0}
              {' x '}
              {passengers} {passengers === 1 ? 'seat' : 'seats'}
            </Text>

            <Text style={styles.priceTotal}>
              Rs. {total.toLocaleString('en-LK')}
            </Text>
          </View>

          <Text style={styles.note}>
            Pay the driver directly. The fare is your share of
            the travel cost.
          </Text>
        </View>

        {/* Driver information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your driver</Text>

          <View style={styles.driverRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            <View style={styles.driverInfo}>
              <View style={styles.inline}>
                <Text style={styles.driverName}>{driverName}</Text>

                {driver.verified ? (
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color={colors.primary}
                    style={styles.tick}
                  />
                ) : null}
              </View>

              <View style={styles.inline}>
                <Ionicons
                  name="star"
                  size={13}
                  color="#F59E0B"
                />
                <Text style={styles.note}>
                  {' '}
                  {Number.isFinite(Number(driver.rating))
                    ? Number(driver.rating).toFixed(1)
                    : 'New'}{' '}
                  · {Number(driver.ridesCount) || 0} rides
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.inline, styles.vehicle]}>
            <Ionicons
              name="car-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.text}>
              {' '}
              {driver.vehicle || 'Vehicle not specified'}
              {driver.hasAC ? ' · A/C' : ''}
            </Text>
          </View>
        </View>

        <Text style={styles.note}>
          {Number.isFinite(Number(ride.seatsFree))
            ? Math.max(0, Number(ride.seatsFree))
            : 'Unknown'}{' '}
          seats left on this ride.
        </Text>
      </ScrollView>

      {/* Fixed booking bar */}
      <View
        style={[
          styles.bar2,
          { paddingBottom: Math.max(insets.bottom, 12) + 12 },
        ]}
      >
        <View style={styles.totalInfo}>
          <Text style={styles.barTotal}>
            Rs. {total.toLocaleString('en-LK')}
          </Text>
          <Text style={styles.note}>
            The driver confirms your request
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.bookButton,
            booking && styles.disabled,
          ]}
          onPress={handleBook}
          disabled={booking}
          accessibilityRole="button"
          accessibilityLabel="Book ride"
        >
          {booking ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.bookText}>Book ride</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  date: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 10,
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 28,
  },
  time: {
    width: 60,
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
  },
  duration: {
    width: 60,
    fontSize: 12,
    color: colors.text,
    opacity: 0.7,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
    marginHorizontal: 12,
  },
  dotEnd: {
    backgroundColor: colors.primary,
  },
  bar: {
    width: 2,
    height: 24,
    backgroundColor: colors.border,
    marginLeft: 5,
    marginRight: 19,
  },
  spacer: {
    flex: 1,
  },
  place: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  text: {
    fontSize: 14,
    color: colors.text,
    flexShrink: 1,
  },
  note: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.7,
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  priceTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 18,
  },
  driverInfo: {
    marginLeft: 12,
    flex: 1,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  tick: {
    marginLeft: 6,
  },
  vehicle: {
    marginTop: 12,
  },
  bar2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  totalInfo: {
    flex: 1,
  },
  barTotal: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  bookButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  bookText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorPage: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
  },
});
