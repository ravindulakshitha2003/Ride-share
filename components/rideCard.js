import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { formatDuration } from '../utils/date';
import { useToast } from '../context/ToastContext';

export default function RideCard({ ride }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isNavigating, setIsNavigating] = useState(false);

  const driverName = ride.driver?.name || '';
  const initial = driverName
    ? driverName.charAt(0).toUpperCase()
    : '?';

  // Navigate to Ride Details with the selected ride data.
  const handlePress = () => {
    if (isNavigating) return; // Prevent duplicate rapid taps
    setIsNavigating(true);

    try {
      // Combine raw backend row and formatted card fields
      const raw = ride.rawRide || {};
      const driverId =
        ride.driverId ||
        raw.driver_id ||
        raw.driverID ||
        raw.driverId ||
        ride.driver?.id ||
        ride.driver?._id;

      const vehicleId =
        ride.vehicleId ||
        raw.vehicle_id ||
        raw.vehicalID ||
        raw.vehicleId ||
        raw.vehicalId ||
        ride.vehicle?.id ||
        ride.vehicle?._id;

      const selectedRide = {
        ...raw,
        ...ride,
        // Normalized driver and vehicle IDs for the details page
        driver_id: driverId,
        driverID: driverId,
        driverId: driverId,
        vehicle_id: vehicleId,
        vehicalID: vehicleId,
        vehicleId: vehicleId,

        // Location names
        origin_name: ride.from || raw.origin_name || raw.origin?.name || raw.origin,
        destination_name: ride.to || raw.destination_name || raw.destination?.name || raw.destination,
        from: ride.from,
        to: ride.to,

        // Pricing and seats
        price_per_seat: ride.pricePerSeat ?? raw.price_per_seat ?? raw.pricePerSeat,
        pricePerSeat: ride.pricePerSeat ?? raw.price_per_seat ?? raw.pricePerSeat,
        available_seats: ride.seatsFree ?? raw.available_seats ?? raw.availableSeats,
        availableSeats: ride.seatsFree ?? raw.available_seats ?? raw.availableSeats,

        // Departure and timing
        departure_at:
          raw.departure_at ||
          raw.departureAt ||
          (ride.date ? `${ride.date}T${ride.departureTime || '00:00'}` : undefined),
      };

      router.push({
        pathname: '/ride-details',
        params: {
          ride: JSON.stringify(selectedRide),
        },
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Navigation Error',
        message: 'Could not load ride details. Please try again.',
      });
    } finally {
      // Reset navigation lock after transition begins
      setTimeout(() => setIsNavigating(false), 1000);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, isNavigating && styles.cardNavigating]}
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={isNavigating}
    >
      <View style={styles.row}>
        {/* Departure time, duration and arrival time */}
        <View style={styles.timeCol}>
          <Text style={styles.time}>
            {ride.departureTime || '--:--'}
          </Text>

          <Text style={styles.duration}>
            {formatDuration(ride.durationMin || 0)}
          </Text>

          <Text style={styles.time}>
            {ride.arrivalTime || '--:--'}
          </Text>
        </View>

        {/* Route indicator */}
        <View style={styles.line}>
          <View style={styles.dot} />
          <View style={styles.bar} />
          <View style={[styles.dot, styles.dotEnd]} />
        </View>

        {/* Origin and destination */}
        <View style={styles.placeCol}>
          <Text style={styles.place} numberOfLines={1}>
            {ride.from || 'Origin unavailable'}
          </Text>

          <Text style={styles.place} numberOfLines={1}>
            {ride.to || 'Destination unavailable'}
          </Text>
        </View>

        {/* Price */}
        <View style={styles.priceCol}>
          <Text style={styles.price}>
            Rs. {ride.pricePerSeat ?? '--'}
          </Text>

          <Text style={styles.perSeat}>per seat</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Driver information */}
      <View style={styles.footer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>

        <View style={styles.driverInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {driverName || 'Driver'}
            </Text>

            {ride.driver?.verified ? (
              <Ionicons
                name="shield-checkmark"
                size={14}
                color="#16A34A"
                style={styles.tick}
              />
            ) : null}
          </View>

          <View style={styles.nameRow}>
            {typeof ride.driver?.rating === 'number' ? (
              <>
                <Ionicons
                  name="star"
                  size={12}
                  color="#F59E0B"
                />

                <Text style={styles.meta}>
                  {' '}{ride.driver.rating.toFixed(1)}
                </Text>
              </>
            ) : null}

            {ride.driver?.hasAC ? (
              <Text style={styles.meta}> · A/C</Text>
            ) : null}
          </View>
        </View>

        {/* Available seats */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {ride.seatsFree ?? 0}{' '}
            {ride.seatsFree === 1 ? 'seat' : 'seats'} left
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: colors.secondary,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardNavigating: {
    opacity: 0.7,
  },

  row: {
    flexDirection: 'row',
  },

  timeCol: {
    height: 78,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    width: 52,
  },

  time: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },

  duration: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
  },

  line: {
    height: 78,
    alignItems: 'center',
    marginHorizontal: 12,
    paddingVertical: 6,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },

  dotEnd: {
    backgroundColor: colors.primary,
  },

  bar: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
  },

  placeCol: {
    height: 78,
    justifyContent: 'space-between',
    flex: 1,
  },

  place: {
    fontSize: 16,
    color: colors.text,
  },

  priceCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },

  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
  },

  perSeat: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.6,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },

  driverInfo: {
    flex: 1,
    marginLeft: 10,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  tick: {
    marginLeft: 4,
  },

  meta: {
    fontSize: 12,
    color: colors.text,
    opacity: 0.7,
  },

  badge: {
    backgroundColor: '#EEEBFF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },

  badgeText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
});