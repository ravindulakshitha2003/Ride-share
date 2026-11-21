
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const COLORS = {
  primary: '#2563EB',
  background: '#F5F7FB',
  white: '#FFFFFF',
  text: '#172033',
  secondary: '#64748B',
  border: '#E2E8F0',
  green: '#16A34A',
  lightBlue: '#EFF6FF',
};

const getObject = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const getName = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;

  return (
    value.name ||
    value.placeName ||
    value.address ||
    value.label ||
    fallback
  );
};

const formatDistance = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'Distance unavailable';
  }

  const metres = Number(value);

  if (!Number.isFinite(metres)) return 'Distance unavailable';
  if (metres === 0) return 'At the location';
  if (metres >= 1000) return `${(metres / 1000).toFixed(1)} km walk`;

  return `${Math.round(metres)} m walk`;
};

const formatDate = (value) => {
  if (!value) return 'Departure date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.smallIcon}>
      <Ionicons name={icon} size={19} color={COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.smallLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const LocationRow = ({ icon, label, location, distance, color }) => (
  <View style={styles.locationRow}>
    <View style={[styles.locationIcon, { backgroundColor: color + '15' }]}>
      <Ionicons name={icon} size={20} color={color} />
    </View>

    <View style={{ flex: 1 }}>
      <Text style={styles.smallLabel}>{label}</Text>
      <Text style={styles.locationName}>{location}</Text>
      <Text style={styles.walkDistance}>{distance}</Text>
    </View>
  </View>
);

export default function RequestRideScreen() {
  const router = useRouter();

  const params = useLocalSearchParams();

  const ride = useMemo(
    () => getObject(params.ride),
    [params.ride]
  );

  const passengers = Math.max(
    1,
    Number(
      Array.isArray(params.passengers)
        ? params.passengers[0]
        : params.passengers
    ) || 1
  );

  const [note, setNote] = useState('');

  // Driver and vehicle information
  const driver = ride.driverDetails || ride.driver || {};
  const vehicle = ride.vehicleDetails || ride.vehicle || {};

  const driverName =
    driver.name ||
    driver.fullName ||
    ride.driverName ||
    'Driver information unavailable';

  const driverPhoto =
    driver.photoUrl ||
    driver.profileImage ||
    driver.profilePicture ||
    null;

  const rating = driver.rating ?? ride.driverRating;

  const verified =
    driver.verified === true ||
    String(driver.verificationStatus || '').toLowerCase() === 'verified';

  const vehicleName =
    vehicle.name ||
    [vehicle.brand, vehicle.model].filter(Boolean).join(' ') ||
    vehicle.vehicleType ||
    driver.vehicle ||
    ride.vehicleName ||
    'Vehicle information unavailable';

  const vehicleNumber =
    vehicle.plateNumber ||
    vehicle.registrationNumber ||
    vehicle.registration_number ||
    ride.vehicle_registration_number ||
    ride.vehicle_number ||
    '';

  // Passenger journey
  const passengerJourney = ride.passengerJourney || {};

  const origin = getName(
    ride.searchPickup || passengerJourney.origin || ride.from,
    'Origin unavailable'
  );

  const destination = getName(
    ride.searchDropoff || passengerJourney.destination || ride.to,
    'Destination unavailable'
  );

  // Backend-suggested pickup and drop-off points
  const suggestedPickup =
    ride.suggestedPickup ||
    ride.suggested_pickup ||
    ride.pickupPoint ||
    {};

  const suggestedDropoff =
    ride.suggestedDropoff ||
    ride.suggested_dropoff ||
    ride.dropoffPoint ||
    {};

  const pickupName = getName(
    suggestedPickup,
    'Suggested pickup unavailable'
  );

  const dropoffName = getName(
    suggestedDropoff,
    'Suggested drop-off unavailable'
  );

  const pickupDistance =
    ride.pickupDistanceMeters ??
    ride.pickupWalkDistanceM ??
    ride.pickup_walk_distance_m;

  const dropoffDistance =
    ride.dropoffDistanceMeters ??
    ride.dropoffWalkDistanceM ??
    ride.dropoff_walk_distance_m;

  // Fare calculation for display
  const pricePerSeat = Number(
    ride.pricePerSeat ??
    ride.price_per_seat ??
    ride.price ??
    0
  );

  const totalFare = pricePerSeat * passengers;

  const currency = ride.currency || 'Rs';

  // Departure information
  const departure =
    ride.departureAt ||
    ride.departure_at ||
    ride.departureDate ||
    ride.date;

  const duration =
    ride.durationMinutes ??
    ride.duration_minutes;

  const distance =
    ride.distanceKm ??
    ride.distance_km;

  const handleRequestRide = () => {
    Alert.alert(
      'Screen UI test',
      'Your Request to Ride screen is working. Booking API integration has not been connected yet.'
    );
  };

  if (!params.ride) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={25} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request to Ride</Text>
          <View style={{ width: 25 }} />
        </View>

        <View style={styles.emptyContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={55}
            color={COLORS.secondary}
          />
          <Text style={styles.emptyTitle}>Ride information missing</Text>
          <Text style={styles.emptyText}>
            Please open this screen from the Ride Details page.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={23} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Request to Ride</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Driver information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your driver</Text>
          <Text style={styles.sectionSubtitle}>
            Review the driver before sending your request
          </Text>

          <View style={styles.driverContainer}>
            {driverPhoto ? (
              <Image
                source={{ uri: driverPhoto }}
                style={styles.driverImage}
              />
            ) : (
              <View style={styles.driverPlaceholder}>
                <Ionicons name="person" size={31} color={COLORS.primary} />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{driverName}</Text>

              <View style={styles.driverMeta}>
                {rating !== undefined && rating !== null && (
                  <View style={styles.metaItem}>
                    <Ionicons name="star" size={15} color="#F59E0B" />
                    <Text style={styles.metaText}>
                      {Number(rating).toFixed(1)}
                    </Text>
                  </View>
                )}

                <View style={styles.metaItem}>
                  <Ionicons
                    name={verified ? 'checkmark-circle' : 'time-outline'}
                    size={15}
                    color={verified ? COLORS.green : COLORS.secondary}
                  />
                  <Text style={styles.metaText}>
                    {verified ? 'Verified driver' : 'Verification unavailable'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Vehicle */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vehicle information</Text>

          <InfoRow
            icon="car-outline"
            label="Vehicle"
            value={vehicleName}
          />

          {vehicleNumber ? (
            <InfoRow
              icon="card-outline"
              label="Registration number"
              value={vehicleNumber}
            />
          ) : null}
        </View>

        {/* Trip details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Trip details</Text>

          <InfoRow
            icon="calendar-outline"
            label="Departure"
            value={formatDate(departure)}
          />

          {duration !== undefined && duration !== null ? (
            <InfoRow
              icon="time-outline"
              label="Estimated duration"
              value={`${duration} minutes`}
            />
          ) : null}

          {distance !== undefined && distance !== null ? (
            <InfoRow
              icon="navigate-outline"
              label="Journey distance"
              value={`${distance} km`}
            />
          ) : null}
        </View>

        {/* Passenger journey */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your journey</Text>
          <Text style={styles.sectionSubtitle}>
            Your original searched locations
          </Text>

          <View style={styles.journeyContainer}>
            <View style={styles.journeyLineColumn}>
              <View style={styles.originDot} />
              <View style={styles.verticalLine} />
              <View style={styles.destinationDot} />
            </View>

            <View style={styles.journeyTextColumn}>
              <View>
                <Text style={styles.smallLabel}>ORIGIN</Text>
                <Text style={styles.locationName}>{origin}</Text>
              </View>

              <View style={{ marginTop: 27 }}>
                <Text style={styles.smallLabel}>DESTINATION</Text>
                <Text style={styles.locationName}>{destination}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Backend suggested locations */}
        <View style={styles.card}>
          <View style={styles.suggestionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Meeting points</Text>
              <Text style={styles.sectionSubtitle}>
                Locations suggested by the route-matching system
              </Text>
            </View>

            <Ionicons
              name="location"
              size={23}
              color={COLORS.primary}
            />
          </View>

          <LocationRow
            icon="walk-outline"
            label="SUGGESTED PICKUP"
            location={pickupName}
            distance={formatDistance(pickupDistance)}
            color={COLORS.green}
          />

          <View style={styles.locationDivider} />

          <LocationRow
            icon="flag-outline"
            label="SUGGESTED DROP-OFF"
            location={dropoffName}
            distance={formatDistance(dropoffDistance)}
            color="#DC6B35"
          />

          <Text style={styles.helperText}>
            These suggested locations are provided by the backend. They are
            displayed here for your review.
          </Text>
        </View>

        {/* Seat and price summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Booking summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Number of seats</Text>
            <Text style={styles.summaryValue}>{passengers}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price per seat</Text>
            <Text style={styles.summaryValue}>
              {currency} {pricePerSeat.toLocaleString()}
            </Text>
          </View>

          <View style={styles.priceDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total fare</Text>
            <Text style={styles.totalPrice}>
              {currency} {totalFare.toLocaleString()}
            </Text>
          </View>

          <Text style={styles.helperText}>
            Total shown is calculated using the displayed price per seat and
            selected seats. The backend must confirm the final fare.
          </Text>
        </View>

        {/* Message to driver */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Message to driver</Text>
          <Text style={styles.sectionSubtitle}>
            Optional: Add a message about your journey
          </Text>

          <TextInput
            style={styles.noteInput}
            placeholder="Example: I have a small luggage bag..."
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={200}
            textAlignVertical="top"
            value={note}
            onChangeText={setNote}
          />

          <Text style={styles.characterCount}>
            {note.length}/200 characters
          </Text>
        </View>

        <View style={{ height: 15 }} />
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.footer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.footerLabel}>Total fare</Text>
          <Text style={styles.footerPrice}>
            {currency} {totalFare.toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleRequestRide}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Request to Ride</Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 58,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 25,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 5,
    marginBottom: 16,
    lineHeight: 18,
  },
  driverContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverImage: {
    width: 57,
    height: 57,
    borderRadius: 30,
    marginRight: 13,
  },
  driverPlaceholder: {
    width: 57,
    height: 57,
    borderRadius: 30,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  driverMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: COLORS.secondary,
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 17,
    gap: 12,
  },
  smallIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.lightBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallLabel: {
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  infoValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  journeyContainer: {
    flexDirection: 'row',
    paddingTop: 5,
  },
  journeyLineColumn: {
    alignItems: 'center',
    width: 25,
    paddingTop: 4,
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.green,
  },
  verticalLine: {
    width: 2,
    height: 37,
    backgroundColor: COLORS.border,
  },
  destinationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DC6B35',
  },
  journeyTextColumn: {
    flex: 1,
    paddingLeft: 10,
  },
  locationName: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    lineHeight: 21,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walkDistance: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },
  locationDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 6,
  },
  helperText: {
    color: COLORS.secondary,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  summaryLabel: {
    color: COLORS.secondary,
    fontSize: 13,
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  priceDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 17,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  noteInput: {
    minHeight: 95,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    padding: 12,
    fontSize: 13,
    color: COLORS.text,
    backgroundColor: '#FAFBFD',
  },
  characterCount: {
    textAlign: 'right',
    color: COLORS.secondary,
    fontSize: 11,
    marginTop: 7,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  footerLabel: {
    color: COLORS.secondary,
    fontSize: 11,
  },
  footerPrice: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 25,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 15,
  },
  emptyText: {
    color: COLORS.secondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
});
