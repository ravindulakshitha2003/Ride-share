import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getDriverVehicleDetails } from '../api/rideDetailsService';
import { colors } from '../theme/colors';
import styles from '../theme/ride-details.styles';

/* =====================================================
   FORMATTERS & HELPERS
===================================================== */

const formatDistance = (meters) => {
  const value = Number(meters);
  if (!Number.isFinite(value) || value < 0) return 'Not available';
  return value >= 1000
    ? `${(value / 1000).toFixed(1)} km`
    : `${Math.round(value)} m`;
};

const formatDuration = (seconds) => {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return 'Not available';
  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours} hr ${minutes} min`;
};

const formatDeparture = (date) => {
  if (!date) return 'Not available';
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return String(date);

  return parsedDate.toLocaleString([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getGeoJsonCoordinate = (point) => {
  if (!point) return null;
  if (Number.isFinite(Number(point.latitude)) && Number.isFinite(Number(point.longitude))) {
    return { latitude: Number(point.latitude), longitude: Number(point.longitude) };
  }
  if (Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng))) {
    return { latitude: Number(point.lat), longitude: Number(point.lng) };
  }
  if (Array.isArray(point.coordinates) && point.coordinates.length >= 2) {
    return { latitude: Number(point.coordinates[1]), longitude: Number(point.coordinates[0]) };
  }
  return null;
};

const getRouteCoordinates = (segment) => {
  if (!segment) return [];
  let list = null;
  if (Array.isArray(segment)) list = segment;
  else if (Array.isArray(segment.coordinates)) list = segment.coordinates;
  else if (Array.isArray(segment.geometry?.coordinates)) list = segment.geometry.coordinates;
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (!item) return null;
      if (Array.isArray(item) && item.length >= 2) {
        return { latitude: Number(item[1]), longitude: Number(item[0]) };
      }
      if (Number.isFinite(item.latitude) && Number.isFinite(item.longitude)) {
        return { latitude: item.latitude, longitude: item.longitude };
      }
      return null;
    })
    .filter(Boolean);
};

/* =====================================================
   REUSABLE SUBCOMPONENTS
===================================================== */

const DetailRow = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLeft}>
      {icon && <Ionicons name={icon} size={17} color={colors.primary} />}
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={styles.detailValue}>
      {value !== undefined && value !== null && value !== '' ? String(value) : 'Not available'}
    </Text>
  </View>
);

const SectionTitle = ({ title, subtitle, icon }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIcon}>
      <Ionicons name={icon} size={19} color={colors.primary} />
    </View>
    <View style={styles.sectionHeadingText}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  </View>
);

const LoadingSection = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="small" color={colors.primary} />
    <Text style={styles.loadingText}>Loading information...</Text>
  </View>
);

// Preference Tag Card Component
function RuleItem({ icon, label, value, tone = 'default' }) {
  const isAllowed = tone === 'positive';
  const isWarning = tone === 'warning';

  const badgeBg = isAllowed ? '#E8F7EE' : isWarning ? '#FEF3C7' : '#F1F0F7';
  const badgeColor = isAllowed ? '#16A34A' : isWarning ? '#B45309' : '#374151';

  return (
    <View style={localStyles.ruleItem}>
      <View style={localStyles.ruleLeft}>
        <Ionicons name={icon} size={18} color={colors.primary} style={localStyles.ruleIcon} />
        <Text style={localStyles.ruleLabel}>{label}</Text>
      </View>
      <View style={[localStyles.ruleBadge, { backgroundColor: badgeBg }]}>
        <Text style={[localStyles.ruleValue, { color: badgeColor }]}>{value}</Text>
      </View>
    </View>
  );
}

/* =====================================================
   MAIN SCREEN
===================================================== */

export default function RideDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fullRouteMapRef = useRef(null);

  const [selectedLocation, setSelectedLocation] = useState('pickup');
  const [showMore, setShowMore] = useState(false);

  const [vehicle, setVehicle] = useState(null);
  const [driver, setDriver] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState('');

  // 1. Parse ride
  const ride = useMemo(() => {
    try {
      if (!params.ride) return null;
      const raw = Array.isArray(params.ride) ? params.ride[0] : params.ride;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (error) {
      console.error('Ride parsing error:', error);
      return null;
    }
  }, [params.ride]);

  // 2. Parse IDs
  const driverID = useMemo(() => (
    ride?.driverID || ride?.driver_id || ride?.driverId ||
    ride?.rawRide?.driverID || ride?.rawRide?.driver_id ||
    ride?.driver?._id || ride?.driver?.id || null
  ), [ride]);

  const vehicleID = useMemo(() => (
    ride?.vehicalID || ride?.vehicle_id || ride?.vehicleId || ride?.vehicalId ||
    ride?.rawRide?.vehicalID || ride?.rawRide?.vehicle_id ||
    ride?.vehicle?._id || ride?.vehicle?.id || null
  ), [ride]);

  // 3. Extract Intermediate Stops & Preferences
  const intermediateStops = useMemo(() => {
    const list =
      ride?.intermediate_stops ||
      ride?.intermediateStops ||
      ride?.rawRide?.intermediate_stops ||
      ride?.rawRide?.intermediateStops ||
      [];
    return Array.isArray(list) ? list : [];
  }, [ride]);

  const preferences = useMemo(() => {
    return (
      ride?.ride_preferences ||
      ride?.ridePreferences ||
      ride?.rawRide?.ride_preferences ||
      ride?.rawRide?.ridePreferences ||
      {}
    );
  }, [ride]);

  const maxWaitingMinutes = Number(
    ride?.max_passenger_waiting_minutes ??
    ride?.maxPassengerWaitingMinutes ??
    ride?.rawRide?.max_passenger_waiting_minutes ??
    10
  );

  // 4. Coordinates
  const pickupCoordinate = useMemo(() => (
    getGeoJsonCoordinate(ride?.suggested_pickup) ||
    getGeoJsonCoordinate(ride?.suggestedPickup) ||
    getGeoJsonCoordinate(ride?.searchPickup) ||
    getGeoJsonCoordinate(ride?.origin)
  ), [ride]);

  const dropoffCoordinate = useMemo(() => (
    getGeoJsonCoordinate(ride?.suggested_dropoff) ||
    getGeoJsonCoordinate(ride?.suggestedDropoff) ||
    getGeoJsonCoordinate(ride?.searchDropoff) ||
    getGeoJsonCoordinate(ride?.destination)
  ), [ride]);

  const fullRouteCoordinates = useMemo(() => {
    const segment =
      ride?.matched_route_segment ||
      ride?.matchedRouteSegment ||
      ride?.geometry ||
      ride?.route_geometry ||
      ride?.rawRide?.geometry;

    const coords = getRouteCoordinates(segment);
    if (coords.length >= 2) return coords;
    if (pickupCoordinate && dropoffCoordinate) return [pickupCoordinate, dropoffCoordinate];
    return [];
  }, [ride, pickupCoordinate, dropoffCoordinate]);

  const activeCoordinate = selectedLocation === 'pickup' ? pickupCoordinate : dropoffCoordinate;

  // 5. Load driver/vehicle info
  useEffect(() => {
    let isMounted = true;
    const loadDriverVehicle = async () => {
      if (!driverID || !vehicleID) {
        setDetailsError('Driver or vehicle identifier is not available.');
        setDetailsLoading(false);
        return;
      }
      try {
        setDetailsLoading(true);
        setDetailsError('');
        const data = await getDriverVehicleDetails(driverID, vehicleID);
        if (!isMounted) return;
        setVehicle(data?.vehicle || null);
        setDriver(data?.driver || null);
      } catch (error) {
        if (!isMounted) return;
        setDetailsError(error.message || 'Could not load vehicle details.');
      } finally {
        if (isMounted) setDetailsLoading(false);
      }
    };
    loadDriverVehicle();
    return () => { isMounted = false; };
  }, [driverID, vehicleID]);

  // Fit route on map
  useEffect(() => {
    if (!showMore || fullRouteCoordinates.length < 2) return;
    const timer = setTimeout(() => {
      fullRouteMapRef.current?.fitToCoordinates(fullRouteCoordinates, {
        edgePadding: { top: 60, right: 50, bottom: 60, left: 50 },
        animated: true,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [showMore, fullRouteCoordinates]);

  if (!ride) {
    return (
      <View style={styles.errorScreen}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorTitle}>Ride details unavailable</Text>
        <Text style={styles.errorMessage}>We could not find the selected ride information.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currency = ride.currency || 'Rs';
  const pricePerSeat = Number(ride.price_per_seat ?? ride.pricePerSeat ?? 0);
  const availableSeats = ride.available_seats ?? ride.availableSeats ?? ride.seatsFree ?? '—';
  const originName = ride.origin_name || ride.from || 'Origin';
  const destinationName = ride.destination_name || ride.to || 'Destination';
  const departureDateString = formatDeparture(
    ride.departure_at || ride.departureAt || (ride.date && ride.departureTime ? `${ride.date}T${ride.departureTime}` : null)
  );

  const fullRouteDistance = ride.full_route_distance_meters ?? ride.distanceMeters;
  const fullRouteDuration = ride.full_route_duration_seconds ?? ride.durationSeconds;
  const yourRideDistance = ride.ride_distance_meters ?? fullRouteDistance;
  const pickupDistance = ride.pickup_distance_meters ?? 0;
  const dropoffDistance = ride.dropoff_distance_meters ?? 0;

  const driverName = driver?.name || ride.driver?.name || 'Driver';
  const driverVerification = driver?.verificationStatus || (ride.driver?.verified ? 'verified' : 'pending');
  const vehicleName = [vehicle?.brand, vehicle?.model].filter(Boolean).join(' ') || 'Vehicle';
  const airConditioning = typeof vehicle?.airConditioning === 'boolean'
    ? (vehicle.airConditioning ? 'Available' : 'Not available')
    : 'Not available';

  // Helper labels for preferences
  const petLabel =
    preferences.pets === 'allowed' ? 'Allowed' : preferences.pets === 'ask_first' ? 'Ask first' : 'Not allowed';
  const genderLabel =
    preferences.gender === 'women_only' ? 'Women only' : preferences.gender === 'men_only' ? 'Men only' : 'Anyone';
  const smokingLabel = preferences.smoking === 'allowed' ? 'Allowed' : 'Not allowed';
  const foodLabel = preferences.food === 'allowed' ? 'Allowed' : 'Not allowed';
  const musicLabel = preferences.music === 'quiet' ? 'Quiet ride' : 'Music allowed';
  const luggageLabel =
    preferences.luggage === 'small_only'
      ? 'Small bags only'
      : preferences.luggage === 'large_allowed'
      ? 'Large allowed'
      : 'Standard';

  const ageLabel =
    preferences.minAge && preferences.maxAge
      ? `${preferences.minAge} - ${preferences.maxAge} years`
      : preferences.minAge
      ? `Min ${preferences.minAge} years`
      : preferences.maxAge
      ? `Max ${preferences.maxAge} years`
      : 'Any age';

  const handleBookRide = () => {
    router.push({
      pathname: '/booking',
      params: { ride: JSON.stringify(ride) },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={23} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <View style={styles.headerPlaceholder}>
          <Ionicons name="shield-checkmark-outline" size={21} color={colors.primary} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 1. RIDE OVERVIEW */}
        <View style={styles.heroCard}>
          <View style={styles.priceHeader}>
            <View>
              <Text style={styles.priceLabel}>PRICE PER SEAT</Text>
              <View style={styles.priceLine}>
                <Text style={styles.price}>{currency} {pricePerSeat.toLocaleString()}</Text>
              </View>
            </View>
            <View style={styles.seatsBadge}>
              <Ionicons name="people" size={16} color={colors.primary} />
              <Text style={styles.seatsText}>{availableSeats} seats</Text>
            </View>
          </View>

          <View style={styles.journeyContainer}>
            <View style={styles.journeyIconColumn}>
              <View style={styles.originDot} />
              <View style={styles.journeyLine} />
              <View style={styles.destinationDot} />
            </View>
            <View style={styles.journeyTextColumn}>
              <View>
                <Text style={styles.locationLabel}>PICKUP / ORIGIN</Text>
                <Text style={styles.locationName}>{originName}</Text>
              </View>
              <View style={styles.destinationBlock}>
                <Text style={styles.locationLabel}>DROP-OFF / DESTINATION</Text>
                <Text style={styles.locationName}>{destinationName}</Text>
              </View>
            </View>
          </View>

          <View style={styles.departureRow}>
            <View style={styles.departureIcon}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.departureLabel}>DEPARTURE</Text>
              <Text style={styles.departureText}>{departureDateString}</Text>
            </View>
          </View>
        </View>

        {/* 2. INTERMEDIATE STOPS SECTION */}
        <View style={styles.card}>
          <SectionTitle
            title="Intermediate stops"
            subtitle={
              intermediateStops.length > 0
                ? `${intermediateStops.length} planned stop${intermediateStops.length === 1 ? '' : 's'} on this route`
                : 'Direct non-stop ride'
            }
            icon="location-outline"
          />

          {intermediateStops.length > 0 ? (
            <View style={localStyles.stopsList}>
              {intermediateStops.map((stop, index) => {
                const stopLocation = stop.location || 'Stop location';
                const stopReason = stop.reason ? stop.reason : null;
                const arrival = stop.arrivalTime || stop.arrival_time;
                const duration = stop.durationMinutes || stop.duration_minutes || 15;
                const flexible = stop.flexibleTime || stop.flexible_time;

                return (
                  <View key={stop.stopId || stop.id || `stop-${index}`} style={localStyles.stopCard}>
                    <View style={localStyles.stopTopRow}>
                      <View style={localStyles.stopBadge}>
                        <Text style={localStyles.stopBadgeText}>{index + 1}</Text>
                      </View>
                      <View style={localStyles.stopHeaderInfo}>
                        <Text style={localStyles.stopLocation}>{stopLocation}</Text>
                        {stopReason ? (
                          <Text style={localStyles.stopReason}>{stopReason}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={localStyles.stopMetaRow}>
                      {arrival ? (
                        <View style={localStyles.stopMetaItem}>
                          <Ionicons name="time-outline" size={14} color={colors.primary} />
                          <Text style={localStyles.stopMetaText}>Arr: {arrival}</Text>
                        </View>
                      ) : null}

                      <View style={localStyles.stopMetaItem}>
                        <Ionicons name="hourglass-outline" size={14} color={colors.primary} />
                        <Text style={localStyles.stopMetaText}>{duration} mins</Text>
                      </View>

                      {flexible ? (
                        <View style={localStyles.flexibleBadge}>
                          <Ionicons name="swap-horizontal-outline" size={12} color="#16A34A" />
                          <Text style={localStyles.flexibleText}>Flexible time</Text>
                        </View>
                      ) : null}
                    </View>

                    {stop.description ? (
                      <Text style={localStyles.stopDescription}>{stop.description}</Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={localStyles.emptyStopsWrap}>
              <Ionicons name="checkmark-circle-outline" size={24} color="#16A34A" />
              <Text style={localStyles.emptyStopsText}>
                This is a direct journey with no scheduled intermediate stops.
              </Text>
            </View>
          )}
        </View>

        {/* 3. RIDE RULES & PREFERENCES SECTION */}
        <View style={styles.card}>
          <SectionTitle
            title="Ride rules & preferences"
            subtitle="Driver guidelines for passengers"
            icon="shield-checkmark-outline"
          />

          <View style={localStyles.rulesGrid}>
            <RuleItem
              icon="paw-outline"
              label="Pets"
              value={petLabel}
              tone={preferences.pets === 'allowed' ? 'positive' : preferences.pets === 'ask_first' ? 'warning' : 'default'}
            />

            <RuleItem
              icon="people-outline"
              label="Passenger gender"
              value={genderLabel}
              tone={preferences.gender === 'any' ? 'positive' : 'warning'}
            />

            <RuleItem
              icon="ban-outline"
              label="Smoking"
              value={smokingLabel}
              tone={preferences.smoking === 'not_allowed' ? 'positive' : 'warning'}
            />

            <RuleItem
              icon="restaurant-outline"
              label="Food & drinks"
              value={foodLabel}
              tone={preferences.food === 'allowed' ? 'positive' : 'default'}
            />

            <RuleItem
              icon="musical-notes-outline"
              label="Music"
              value={musicLabel}
              tone="default"
            />

            <RuleItem
              icon="briefcase-outline"
              label="Luggage"
              value={luggageLabel}
              tone="default"
            />

            <RuleItem
              icon="calendar-outline"
              label="Age restriction"
              value={ageLabel}
              tone="default"
            />

            <RuleItem
              icon="time-outline"
              label="Max pickup wait"
              value={`${maxWaitingMinutes} mins`}
              tone={maxWaitingMinutes > 15 ? 'warning' : 'default'}
            />
          </View>
        </View>

        {/* 4. DRIVER INFORMATION */}
        <View style={styles.card}>
          <SectionTitle
            title="Your driver"
            subtitle="Meet the person behind your ride"
            icon="person-outline"
          />
          {detailsLoading ? (
            <LoadingSection />
          ) : (
            <View style={styles.driverInfo}>
              <View style={styles.driverIcon}>
                <Ionicons name="person" size={28} color={colors.primary} />
              </View>
              <View style={styles.driverText}>
                <Text style={styles.driverName}>{driverName}</Text>
                <View style={styles.verificationBadge}>
                  <Ionicons
                    name={String(driverVerification).toLowerCase() === 'verified' ? 'checkmark-circle' : 'time-outline'}
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.driverStatus}>{driverVerification}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* 5. VEHICLE PREVIEW */}
        <View style={styles.card}>
          <SectionTitle
            title="Your ride vehicle"
            subtitle="Vehicle information"
            icon="car-sport-outline"
          />
          {detailsLoading ? (
            <LoadingSection />
          ) : vehicle ? (
            <>
              {vehicle.vehiclePhotoUrl ? (
                <Image source={{ uri: vehicle.vehiclePhotoUrl }} style={styles.vehicleImage} resizeMode="cover" />
              ) : (
                <View style={styles.vehicleImageFallback}>
                  <Ionicons name="car-sport-outline" size={48} color={colors.primary} />
                  <Text style={styles.fallbackText}>Vehicle photo unavailable</Text>
                </View>
              )}
              <Text style={styles.vehicleName}>{vehicleName}</Text>
              <View style={styles.vehicleTypeBadge}>
                <Ionicons name="car-outline" size={15} color={colors.primary} />
                <Text style={styles.vehicleTypeText}>{vehicle.vehicleType || 'Vehicle'}</Text>
              </View>

              <View style={styles.vehicleQuickInfo}>
                <View style={styles.quickInfoItem}>
                  <Ionicons name="people-outline" size={17} color={colors.primary} />
                  <Text style={styles.quickInfoText}>{vehicle.passengerSeats ?? '—'} seats</Text>
                </View>
                <View style={styles.quickInfoItem}>
                  <Ionicons name="snow-outline" size={17} color={colors.primary} />
                  <Text style={styles.quickInfoText}>AC {airConditioning === 'Available' ? 'Yes' : 'No'}</Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.fallbackText}>Vehicle information is not available.</Text>
          )}
        </View>

        {/* 6. SEE MORE DETAILS (MAPS & JOURNEY) */}
        <TouchableOpacity
          style={styles.expandButton}
          activeOpacity={0.8}
          onPress={() => setShowMore((prev) => !prev)}
        >
          <View style={styles.expandButtonLeft}>
            <View style={styles.expandIcon}>
              <Ionicons name="information-circle-outline" size={21} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.expandTitle}>{showMore ? 'Show less' : 'Explore more details'}</Text>
              <Text style={styles.expandSubtitle}>
                {showMore ? 'Hide additional information' : 'Journey estimates, maps & full specifications'}
              </Text>
            </View>
          </View>
          <Ionicons name={showMore ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} />
        </TouchableOpacity>

        {showMore && (
          <View>
            {/* Journey stats */}
            <View style={styles.card}>
              <SectionTitle title="Journey information" subtitle="Distance and travel estimates" icon="analytics-outline" />
              <DetailRow icon="map-outline" label="Full route distance" value={formatDistance(fullRouteDistance)} />
              <DetailRow icon="time-outline" label="Full route duration" value={formatDuration(fullRouteDuration)} />
              <DetailRow icon="navigate-outline" label="Your ride distance" value={formatDistance(yourRideDistance)} />
              <DetailRow icon="location-outline" label="Pickup distance from route" value={formatDistance(pickupDistance)} />
              <DetailRow icon="flag-outline" label="Drop-off distance from route" value={formatDistance(dropoffDistance)} />
            </View>

            {/* Pickup / dropoff map */}
            <View style={styles.card}>
              <SectionTitle title="Pickup and drop-off" subtitle="Check your suggested locations" icon="location-outline" />
              <View style={styles.locationTabs}>
                <TouchableOpacity
                  style={[styles.locationTab, selectedLocation === 'pickup' && styles.activeLocationTab]}
                  onPress={() => setSelectedLocation('pickup')}
                >
                  <Ionicons name="location" size={17} color={selectedLocation === 'pickup' ? colors.white : colors.primary} />
                  <Text style={[styles.locationTabText, selectedLocation === 'pickup' && styles.activeLocationTabText]}>Pickup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.locationTab, selectedLocation === 'dropoff' && styles.activeLocationTab]}
                  onPress={() => setSelectedLocation('dropoff')}
                >
                  <Ionicons name="flag" size={17} color={selectedLocation === 'dropoff' ? colors.white : colors.primary} />
                  <Text style={[styles.locationTabText, selectedLocation === 'dropoff' && styles.activeLocationTabText]}>Drop-off</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.mapContainer}>
                {activeCoordinate ? (
                  <MapView
                    key={selectedLocation}
                    style={styles.map}
                    initialRegion={{ ...activeCoordinate, latitudeDelta: 0.025, longitudeDelta: 0.025 }}
                  >
                    <Marker
                      coordinate={activeCoordinate}
                      title={selectedLocation === 'pickup' ? 'Pickup location' : 'Drop-off location'}
                      pinColor={selectedLocation === 'pickup' ? colors.primary : colors.accent}
                    />
                  </MapView>
                ) : (
                  <View style={styles.mapFallback}>
                    <Ionicons name="location-outline" size={35} color={colors.primary} />
                    <Text style={styles.fallbackText}>Location coordinate is unavailable.</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Full driver route map */}
            <View style={styles.card}>
              <SectionTitle title="Full driver route" subtitle="The complete route followed by driver" icon="map-outline" />
              <View style={styles.mapContainer}>
                {fullRouteCoordinates.length >= 2 ? (
                  <MapView
                    ref={fullRouteMapRef}
                    style={styles.map}
                    initialRegion={{ ...fullRouteCoordinates[0], latitudeDelta: 1, longitudeDelta: 1 }}
                  >
                    <Polyline coordinates={fullRouteCoordinates} strokeColor={colors.primary} strokeWidth={5} />
                    <Marker coordinate={fullRouteCoordinates[0]} title="Route start" pinColor="#16A36A" />
                    <Marker coordinate={fullRouteCoordinates[fullRouteCoordinates.length - 1]} title="Destination" pinColor={colors.primary} />
                  </MapView>
                ) : (
                  <View style={styles.mapFallback}>
                    <Ionicons name="map-outline" size={35} color={colors.primary} />
                    <Text style={styles.fallbackText}>Full route geometry is unavailable.</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {detailsError ? (
          <View style={styles.errorNotice}>
            <Ionicons name="alert-circle-outline" size={19} color={colors.error} />
            <Text style={styles.errorNoticeText}>{detailsError}</Text>
          </View>
        ) : null}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* BOOKING BUTTON */}
      <View style={styles.bookingContainer}>
        <View style={styles.bookingPrice}>
          <Text style={styles.bookingPriceLabel}>PRICE PER SEAT</Text>
          <Text style={styles.bookingPriceValue}>{currency} {pricePerSeat.toLocaleString()}</Text>
        </View>

        <TouchableOpacity
          style={[styles.bookButton, Number(availableSeats) <= 0 && styles.disabledBookButton]}
          onPress={handleBookRide}
          activeOpacity={0.85}
          disabled={Number.isFinite(Number(availableSeats)) && Number(availableSeats) <= 0}
        >
          <Text style={styles.bookButtonText}>
            {Number.isFinite(Number(availableSeats)) && Number(availableSeats) <= 0 ? 'No Seats' : 'Book This Ride'}
          </Text>
          <Ionicons name="arrow-forward" size={19} color={colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* =====================================================
   LOCAL STYLES FOR STOPS & RULES
===================================================== */
const localStyles = StyleSheet.create({
  // Stops
  stopsList: {
    gap: 11,
  },
  stopCard: {
    backgroundColor: '#FBFBFE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ECE9F6',
    padding: 13,
  },
  stopTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stopBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EEECFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stopBadgeText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 12,
  },
  stopHeaderInfo: {
    flex: 1,
  },
  stopLocation: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  stopReason: {
    fontSize: 12,
    color: '#817D9C',
    marginTop: 2,
  },
  stopMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0EEF8',
  },
  stopMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopMetaText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  flexibleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F7EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  flexibleText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
  },
  stopDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyStopsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 14,
    gap: 10,
  },
  emptyStopsText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
  },

  // Rules & Preferences
  rulesGrid: {
    gap: 8,
  },
  ruleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F2F9',
  },
  ruleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  ruleIcon: {
    marginRight: 10,
  },
  ruleLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  ruleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ruleValue: {
    fontSize: 12,
    fontWeight: '800',
  },
});