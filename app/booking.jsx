import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { bookRideSeat } from '../api/rideService';
import { colors as C } from '../theme/colors';
import { useToast } from '../context/ToastContext';

function formatCurrency(amount, currency = 'Rs') {
  if (amount == null || Number.isNaN(Number(amount))) return `${currency} 0`;
  return `${currency} ${String(Math.round(Number(amount))).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatDistance(meters) {
  const m = Number(meters);
  if (!Number.isFinite(m) || m <= 0) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function estimateWalkTime(meters) {
  const m = Number(meters);
  if (!m || m <= 0) return '';
  return `${Math.ceil(m / 80)} min walk`;
}

function extractCoords(source) {
  if (!source) return null;
  if (source.coordinates && Array.isArray(source.coordinates)) {
    return { longitude: Number(source.coordinates[0]), latitude: Number(source.coordinates[1]) };
  }
  if (source.latitude !== undefined && source.longitude !== undefined) {
    return { latitude: Number(source.latitude), longitude: Number(source.longitude) };
  }
  if (source.lat !== undefined && source.lng !== undefined) {
    return { latitude: Number(source.lat), longitude: Number(source.lng) };
  }
  return null;
}

/* =======================================================
   BOOKING CONFIRMATION SCREEN (P2)
======================================================= */
export default function BookingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const { showToast } = useToast();

  // 1. Parse ride passed from ride-details.jsx
  const ride = useMemo(() => {
    try {
      if (!params.ride) return {};
      const raw = Array.isArray(params.ride) ? params.ride[0] : params.ride;
      return typeof raw === 'string' ? JSON.parse(raw) : raw || {};
    } catch (err) {
      console.error('Failed to parse ride parameters:', err);
      return {};
    }
  }, [params.ride]);

  const maxAvailableSeats = Number(ride.available_seats ?? ride.availableSeats ?? ride.seatsFree ?? 1);
  const [selectedSeats, setSelectedSeats] = useState(1);
  const [isBooking, setIsBooking] = useState(false);

  const driver = ride.driver_id || {};
  const pricePerSeat = Number(ride.price_per_seat ?? ride.pricePerSeat ?? 0);
  const totalPrice = pricePerSeat * selectedSeats;
  const currency = ride.currency || 'Rs';

  const originName = ride.origin_name || ride.from || 'Origin';
  const destinationName = ride.destination_name || ride.to || 'Destination';
  const departureDate = ride.departure_at || ride.departureAt || ride.date || 'Upcoming Trip';

  const handleSeatChange = useCallback(
    (delta) => {
      setSelectedSeats((current) => {
        const next = current + delta;
        if (next < 1) return 1;
        if (next > maxAvailableSeats) return maxAvailableSeats;
        return next;
      });
    },
    [maxAvailableSeats]
  );

  const handleConfirmBooking = useCallback(async () => {
    if (isBooking) return; // Prevent double submission
    const routeId = ride.route_id || ride.id;

    if (!routeId) {
      showToast({
        type: 'error',
        title: 'Invalid Route',
        message: 'Invalid route selection. Please go back and try again.',
      });
      return;
    }

    Alert.alert(
      'Confirm Booking Request',
      `Submit request for ${selectedSeats} seat${selectedSeats > 1 ? 's' : ''} (${formatCurrency(
        totalPrice,
        currency
      )}) to the driver?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Request',
          onPress: async () => {
            setIsBooking(true);
            try {
              const pickupCoords =
                extractCoords(ride.suggested_pickup) ||
                extractCoords(ride.suggestedPickup) ||
                extractCoords(ride.searchPickup) ||
                extractCoords(ride.origin) ||
                { latitude: 0, longitude: 0 };

              const dropoffCoords =
                extractCoords(ride.suggested_dropoff) ||
                extractCoords(ride.suggestedDropoff) ||
                extractCoords(ride.searchDropoff) ||
                extractCoords(ride.destination) ||
                { latitude: 0, longitude: 0 };

              const originCoords =
                extractCoords(ride.searchPickup) ||
                extractCoords(ride.origin) ||
                pickupCoords;

              const destCoords =
                extractCoords(ride.searchDropoff) ||
                extractCoords(ride.destination) ||
                dropoffCoords;

              const driver = ride.driver_id;

              await bookRideSeat({
                routeId,
                seats: selectedSeats,
                driver,

                passengerOrigin: {
                  name: originName,
                  latitude: originCoords.latitude,
                  longitude: originCoords.longitude,
                },
                passengerDestination: {
                  name: destinationName,
                  latitude: destCoords.latitude,
                  longitude: destCoords.longitude,
                },
                pickupPoint: {
                  name: originName,
                  latitude: pickupCoords.latitude,
                  longitude: pickupCoords.longitude,
                },
                dropoffPoint: {
                  name: destinationName,
                  latitude: dropoffCoords.latitude,
                  longitude: dropoffCoords.longitude,
                },
                pickupWalkDistanceM: ride.pickup_distance_meters ?? ride.pickupDistanceMeters ?? 0,
                dropoffWalkDistanceM: ride.dropoff_distance_meters ?? ride.dropoffDistanceMeters ?? 0,
              });

              showToast({
                type: 'success',
                title: 'Request Sent! 🎉',
                message: 'Your seat request was submitted to the driver.',
                duration: 4000,
              });

              Alert.alert(
                'Request Sent! 🎉',
                'Your seat request was submitted. The driver will review and accept it shortly.',
                [
                  {
                    text: 'View Search',
                    onPress: () => router.replace('/resultsScreen'),
                  },
                ]
              );
            } catch (err) {
              showToast({
                type: 'error',
                title: 'Booking Request Failed',
                message: err.message || 'Could not complete your request.',
              });
              Alert.alert('Booking Request Failed', err.message || 'Could not complete your request.');
            } finally {
              setIsBooking(false);
            }
          },
        },
      ]
    );
  }, [ride, selectedSeats, totalPrice, currency, originName, destinationName, router, isBooking, showToast]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </Pressable>
        <Text style={styles.topBarTitle}>Confirm Booking</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Route Card Hero */}
        <LinearGradient colors={[C.primary, C.secondary]} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroDate}>{departureDate}</Text>
              <Text style={styles.heroDuration}>
                {ride.durationMin ? `${ride.durationMin} mins travel time` : 'Confirmed Corridor'}
              </Text>
            </View>
            <View style={styles.heroPriceBadge}>
              <Text style={styles.heroPriceValue}>{formatCurrency(pricePerSeat, currency)}</Text>
              <Text style={styles.heroPricePerSeat}>per seat</Text>
            </View>
          </View>

          <View style={styles.heroRouteRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroPlace} numberOfLines={2}>{originName}</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={C.accent} style={{ marginHorizontal: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.heroPlace} numberOfLines={2}>{destinationName}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Seat Counter Stepper */}
        <View style={styles.card}>
          <View style={styles.stepperRow}>
            <View>
              <Text style={styles.sectionTitle}>Seats to Request</Text>
              <Text style={styles.stepperSubtext}>{maxAvailableSeats} seats currently open</Text>
            </View>
            <View style={styles.stepperControls}>
              <Pressable
                onPress={() => handleSeatChange(-1)}
                disabled={selectedSeats <= 1}
                style={[styles.stepBtn, selectedSeats <= 1 && styles.stepBtnDisabled]}
              >
                <Ionicons name="remove" size={18} color={selectedSeats <= 1 ? C.grey : C.primary} />
              </Pressable>
              <Text style={styles.seatCount}>{selectedSeats}</Text>
              <Pressable
                onPress={() => handleSeatChange(1)}
                disabled={selectedSeats >= maxAvailableSeats}
                style={[styles.stepBtn, selectedSeats >= maxAvailableSeats && styles.stepBtnDisabled]}
              >
                <Ionicons name="add" size={18} color={selectedSeats >= maxAvailableSeats ? C.grey : C.primary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Pickup & Dropoff Steps */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Meeting & Arrival Points</Text>

          <View style={styles.stepItem}>
            <Ionicons name="walk-outline" size={20} color={C.primary} style={styles.stepIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Walk to Pickup Point</Text>
              <Text style={styles.stepDesc}>
                {ride.pickup_distance_meters
                  ? `${formatDistance(ride.pickup_distance_meters)} (${estimateWalkTime(
                      ride.pickup_distance_meters
                    )}) walk to meeting point`
                  : 'Near your requested origin point'}
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <Ionicons name="car-outline" size={20} color={C.primary} style={styles.stepIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Ride in Vehicle</Text>
              <Text style={styles.stepDesc}>
                {ride.ride_distance_meters
                  ? `${formatDistance(ride.ride_distance_meters)} route corridor`
                  : 'Main driving route'}
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <Ionicons name="location-outline" size={20} color={C.success} style={styles.stepIcon} />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Walk to Final Destination</Text>
              <Text style={styles.stepDesc}>
                {ride.dropoff_distance_meters
                  ? `${formatDistance(ride.dropoff_distance_meters)} walk to destination`
                  : 'Near your requested destination'}
              </Text>
            </View>
          </View>
        </View>

        {/* Fare Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fare Summary</Text>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>{formatCurrency(pricePerSeat, currency)} × {selectedSeats} seat(s)</Text>
            <Text style={styles.fareValue}>{formatCurrency(totalPrice, currency)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.fareRow}>
            <Text style={styles.totalLabel}>Total Estimated Fare</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalPrice, currency)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View>
          <Text style={styles.bottomPriceLabel}>Total Fare</Text>
          <Text style={styles.bottomPriceValue}>{formatCurrency(totalPrice, currency)}</Text>
        </View>
        <Pressable
          onPress={handleConfirmBooking}
          disabled={isBooking}
          style={[styles.bookBtn, isBooking && styles.bookBtnDisabled]}
        >
          {isBooking ? (
            <ActivityIndicator color={C.surface} />
          ) : (
            <Text style={styles.bookBtnText}>Confirm {selectedSeats} Seat{selectedSeats > 1 ? 's' : ''}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  topBar: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  scrollContent: { padding: 16 },
  heroCard: { borderRadius: 20, padding: 20, marginBottom: 16 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  heroDate: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' },
  heroDuration: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  heroPriceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroPriceValue: { color: C.surface, fontSize: 17, fontWeight: '800' },
  heroPricePerSeat: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },
  heroRouteRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  heroPlace: { color: 'rgba(255,255,255,0.95)', fontSize: 15, fontWeight: '700' },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 12 },
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  stepIcon: { marginRight: 12, marginTop: 2 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  stepDesc: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  stepperRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepperSubtext: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    padding: 3,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: { backgroundColor: C.greySoft },
  seatCount: { minWidth: 36, textAlign: 'center', fontSize: 16, fontWeight: '800', color: C.text },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  fareLabel: { fontSize: 14, color: C.textMuted },
  fareValue: { fontSize: 14, fontWeight: '600', color: C.text },
  divider: { height: 1, backgroundColor: C.border, marginVertical: 8 },
  totalLabel: { fontSize: 15, fontWeight: '800', color: C.text },
  totalValue: { fontSize: 17, fontWeight: '800', color: C.primary },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomPriceLabel: { fontSize: 12, color: C.textMuted },
  bottomPriceValue: { fontSize: 20, fontWeight: '800', color: C.primary },
  bookBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { color: C.surface, fontSize: 15, fontWeight: '800' },
});
