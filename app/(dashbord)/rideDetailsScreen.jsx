import React, { useMemo } from 'react';

import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

/* =======================================================
   DESIGN TOKENS & HELPERS
======================================================= */

const C = {
  primary: '#5B4BDB',
  secondary: '#312E81',
  accent: '#F0ABFC',
  background: '#F8F7FF',
  surface: '#FFFFFF',
  text: '#24213B',
  textMuted: 'rgba(36,33,59,0.6)',
  border: '#E4E1F5',
  tint: '#EEEBFF',
  success: '#16A34A',
  star: '#F59E0B',
  greySoft: '#F1F0F7',
  grey: '#6B7280',
};

function formatCurrency(amount, currency = 'Rs') {
  if (amount == null || Number.isNaN(Number(amount))) {
    return `${currency} 0`;
  }

  return `${currency} ${String(Math.round(Number(amount))).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ','
  )}`;
}

function formatDistance(meters) {
  const value = Number(meters);

  if (!Number.isFinite(value) || value <= 0) return '';
  if (value < 1000) return `${Math.round(value)} m`;

  return `${(value / 1000).toFixed(1)} km`;
}

function estimateWalkTime(meters) {
  const value = Number(meters);

  if (!value || value <= 0) return '';
  return `${Math.ceil(value / 80)} min walk`;
}

/* =======================================================
   MAIN SCREEN COMPONENT

   This screen only displays ride information.
   Seat selection and booking submission happen elsewhere.
======================================================= */

export default function RideDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  // Parse ride data received from the previous screen.
  const ride = useMemo(() => {
    try {
      if (typeof params.ride === 'string') {
        return JSON.parse(params.ride);
      }

      if (Array.isArray(params.ride)) {
        return JSON.parse(params.ride[0]);
      }

      return params.ride || {};
    } catch (error) {
      console.error('Failed to parse ride parameters:', error);
      return {};
    }
  }, [params.ride]);

  // Passenger count was selected on resultsScreen.jsx.
  // This screen displays it but does not allow changing it.
  const passengers = useMemo(() => {
    const rawPassengers = Array.isArray(params.passengers)
      ? params.passengers[0]
      : params.passengers;

    const parsedPassengers = Number(rawPassengers);
    return Number.isInteger(parsedPassengers) && parsedPassengers > 0
      ? parsedPassengers
      : 1;
  }, [params.passengers]);

  const driver = ride.driver || {};
  const pricePerSeat = Number(ride.pricePerSeat || 0);
  const totalPrice = pricePerSeat * passengers;
  const currency = ride.currency || 'Rs';

  // Continue to the next screen. Do not call the old
  // /api/v1/route-matching/book endpoint from this screen.
  const handleContinue = () => {
    router.push({
      pathname: '/(dashbord)/ride-details',
      params: {
        ride: JSON.stringify(ride),
        passengers: String(passengers),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Navigation Header */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="arrow-left" size={24} color={C.text} />
        </Pressable>

        <Text style={styles.topBarTitle}>Ride Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Route Card Hero */}
        <LinearGradient
          colors={[C.primary, C.secondary]}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroDate}>
                {ride.date || 'Upcoming Trip'}
              </Text>
              <Text style={styles.heroDuration}>
                {ride.durationMin
                  ? `${ride.durationMin} mins travel time`
                  : 'Direct corridor'}
              </Text>
            </View>

            <View style={styles.heroPriceBadge}>
              <Text style={styles.heroPriceValue}>
                {formatCurrency(pricePerSeat, currency)}
              </Text>
              <Text style={styles.heroPricePerSeat}>per seat</Text>
            </View>
          </View>

          <View style={styles.heroRouteRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTime}>
                {ride.departureTime || '--:--'}
              </Text>
              <Text style={styles.heroPlace} numberOfLines={2}>
                {ride.from || 'Origin'}
              </Text>
            </View>

            <Icon
              name="ray-start-end"
              size={22}
              color={C.accent}
              style={{ marginHorizontal: 12 }}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.heroTime}>
                {ride.arrivalTime || '--:--'}
              </Text>
              <Text style={styles.heroPlace} numberOfLines={2}>
                {ride.to || 'Destination'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Driver Profile */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Driver & Vehicle</Text>

          <View style={styles.driverRow}>
            <View style={styles.avatarBox}>
              {driver.photoUrl ? (
                <Image
                  source={{ uri: driver.photoUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {(driver.name || '?').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.driverName}>
                {driver.name || 'Verified Driver'}
              </Text>

              <View style={styles.ratingRow}>
                <Icon name="star" size={15} color={C.star} />
                <Text style={styles.ratingNumber}>
                  {driver.rating
                    ? Number(driver.rating).toFixed(1)
                    : 'New'}
                </Text>

                {driver.ridesCount ? (
                  <Text style={styles.ridesCountText}>
                    {' '}
                    · {driver.ridesCount} trips
                  </Text>
                ) : null}
              </View>

              <Text style={styles.vehicleText}>
                {driver.vehicle || ride.vehicleType || 'Vehicle'}
              </Text>
            </View>
          </View>
        </View>

        {/* Pickup & Dropoff Itinerary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pickup & Dropoff Steps</Text>

          <View style={styles.stepItem}>
            <Icon
              name="walk"
              size={20}
              color={C.primary}
              style={styles.stepIcon}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Walk to Pickup Point</Text>
              <Text style={styles.stepDesc}>
                {ride.pickupDistanceMeters
                  ? `${formatDistance(
                      ride.pickupDistanceMeters
                    )} (${estimateWalkTime(
                      ride.pickupDistanceMeters
                    )}) from origin`
                  : 'At your selected origin point'}
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <Icon
              name="car"
              size={20}
              color={C.primary}
              style={styles.stepIcon}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Ride in Vehicle</Text>
              <Text style={styles.stepDesc}>
                {ride.rideDistanceMeters
                  ? `${formatDistance(ride.rideDistanceMeters)} route corridor`
                  : 'Main driving segment'}
              </Text>
            </View>
          </View>

          <View style={styles.stepItem}>
            <Icon
              name="map-marker-check"
              size={20}
              color={C.success}
              style={styles.stepIcon}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>Walk to Destination</Text>
              <Text style={styles.stepDesc}>
                {ride.dropoffDistanceMeters
                  ? `${formatDistance(
                      ride.dropoffDistanceMeters
                    )} walk to final destination`
                  : 'Near your requested destination'}
              </Text>
            </View>
          </View>
        </View>

        {/* Selected Passenger Count - Read Only */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Passengers</Text>

          <View style={styles.passengerInfoRow}>
            <View style={styles.passengerIconBox}>
              <Icon name="account-group" size={22} color={C.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.passengerCount}>
                {passengers} {passengers === 1 ? 'Passenger' : 'Passengers'}
              </Text>
              <Text style={styles.passengerSubtext}>
                Selected on the search results screen
              </Text>
            </View>
          </View>
        </View>

        {/* Fare Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fare Summary</Text>

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>
              {formatCurrency(pricePerSeat, currency)} × {passengers} seat(s)
            </Text>
            <Text style={styles.fareValue}>
              {formatCurrency(totalPrice, currency)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fareRow}>
            <Text style={styles.totalLabel}>Total Fare</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(totalPrice, currency)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Continue Action Bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <View>
          <Text style={styles.bottomPriceLabel}>Total</Text>
          <Text style={styles.bottomPriceValue}>
            {formatCurrency(totalPrice, currency)}
          </Text>
        </View>

        <Pressable
          onPress={handleContinue}
          style={styles.continueBtn}
          accessibilityRole="button"
        >
          <Text style={styles.continueBtnText}>Continue</Text>
          <Icon name="arrow-right" size={18} color={C.surface} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* =======================================================
   STYLES
======================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
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
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.text,
  },
  scrollContent: {
    padding: 16,
  },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroDate: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  heroDuration: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  heroPriceBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroPriceValue: {
    color: C.surface,
    fontSize: 17,
    fontWeight: '800',
  },
  heroPricePerSeat: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  heroRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTime: {
    color: C.surface,
    fontSize: 17,
    fontWeight: '800',
  },
  heroPlace: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
    marginBottom: 12,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 52,
    height: 52,
  },
  avatarText: {
    color: C.surface,
    fontSize: 20,
    fontWeight: '800',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  ratingNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
    marginLeft: 3,
  },
  ridesCountText: {
    fontSize: 12,
    color: C.textMuted,
  },
  vehicleText: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 3,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  stepIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  stepDesc: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  passengerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  passengerCount: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  passengerSubtext: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 3,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  fareLabel: {
    fontSize: 14,
    color: C.textMuted,
  },
  fareValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: C.text,
  },
  totalValue: {
    fontSize: 17,
    fontWeight: '800',
    color: C.primary,
  },
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
  bottomPriceLabel: {
    fontSize: 12,
    color: C.textMuted,
  },
  bottomPriceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: C.primary,
  },
  continueBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: C.surface,
    fontSize: 15,
    fontWeight: '800',
  },
});
