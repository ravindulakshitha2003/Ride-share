
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

import { getDriverVehicleDetails } from '../api/rideDetailsService';
import { colors } from '../theme/colors';
import styles from '../theme/ride-details.styles';
import { SafeAreaView } from "react-native-safe-area-context";

/* =====================================================
   FORMATTER HELPERS
===================================================== */

const formatDistance = (meters) => {
  const value = Number(meters);

  if (!Number.isFinite(value) || value < 0) {
    return 'Not available';
  }

  return value >= 1000
    ? `${(value / 1000).toFixed(1)} km`
    : `${Math.round(value)} m`;
};

const formatDuration = (seconds) => {
  const value = Number(seconds);

  if (!Number.isFinite(value) || value <= 0) {
    return 'Not available';
  }

  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);

  if (hours === 0) return `${minutes} min`;

  return `${hours} hr ${minutes} min`;
};

const formatDeparture = (date) => {
  if (!date) return 'Not available';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(date);
  }

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

  if (
    Number.isFinite(Number(point.latitude)) &&
    Number.isFinite(Number(point.longitude)) &&
    point.latitude !== undefined &&
    point.longitude !== undefined
  ) {
    return {
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
    };
  }

  if (
    Number.isFinite(Number(point.lat)) &&
    Number.isFinite(Number(point.lng)) &&
    point.lat !== undefined &&
    point.lng !== undefined
  ) {
    return {
      latitude: Number(point.lat),
      longitude: Number(point.lng),
    };
  }

  const coordinates = point.coordinates;

  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    const lng = Number(coordinates[0]);
    const lat = Number(coordinates[1]);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }
  }

  return null;
};

const getRouteCoordinates = (segment) => {
  if (!segment) return [];

  let list = null;

  if (Array.isArray(segment)) {
    list = segment;
  } else if (Array.isArray(segment.coordinates)) {
    list = segment.coordinates;
  } else if (Array.isArray(segment.geometry?.coordinates)) {
    list = segment.geometry.coordinates;
  }

  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (!item) return null;

      if (Array.isArray(item) && item.length >= 2) {
        const lng = Number(item[0]);
        const lat = Number(item[1]);

        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { latitude: lat, longitude: lng };
        }
      }

      if (
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude)
      ) {
        return {
          latitude: item.latitude,
          longitude: item.longitude,
        };
      }

      if (
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lng)
      ) {
        return {
          latitude: item.lat,
          longitude: item.lng,
        };
      }

      return null;
    })
    .filter(Boolean);
};

/* =====================================================
   REUSABLE COMPONENTS
===================================================== */

const DetailRow = ({ label, value, icon }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLeft}>
      {icon && (
        <Ionicons
          name={icon}
          size={17}
          color={colors.primary}
        />
      )}
      <Text style={styles.detailLabel}>{label}</Text>
    </View>

    <Text style={styles.detailValue}>
      {value !== undefined && value !== null && value !== ''
        ? String(value)
        : 'Not available'}
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
      {subtitle ? (
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      ) : null}
    </View>
  </View>
);

const LoadingSection = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="small" color={colors.primary} />
    <Text style={styles.loadingText}>Loading information...</Text>
  </View>
);

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

  /* -----------------------------------------------
     Parse ride
  ----------------------------------------------- */

  const ride = useMemo(() => {
    try {
      if (!params.ride) return null;

      const raw = Array.isArray(params.ride)
        ? params.ride[0]
        : params.ride;

      return typeof raw === 'string'
        ? JSON.parse(raw)
        : raw;
    } catch (error) {
      console.error('Ride parsing error:', error);
      return null;
    }
  }, [params.ride]);

  /* -----------------------------------------------
     Driver ID
  ----------------------------------------------- */

  const driverID = useMemo(() => (
    ride?.driverID ||
    ride?.driver_id ||
    ride?.driverId ||
    ride?.rawRide?.driverID ||
    ride?.rawRide?.driver_id ||
    ride?.rawRide?.driverId ||
    ride?.driver?._id ||
    ride?.driver?.id ||
    null
  ), [ride]);

  /* -----------------------------------------------
     Vehicle ID
  ----------------------------------------------- */

  const vehicleID = useMemo(() => (
    ride?.vehicalID ||
    ride?.vehicle_id ||
    ride?.vehicleId ||
    ride?.vehicalId ||
    ride?.rawRide?.vehicalID ||
    ride?.rawRide?.vehicle_id ||
    ride?.rawRide?.vehicleId ||
    ride?.rawRide?.vehicalId ||
    ride?.vehicle?._id ||
    ride?.vehicle?.id ||
    null
  ), [ride]);

  /* -----------------------------------------------
     Pickup coordinates
  ----------------------------------------------- */

  const pickupCoordinate = useMemo(() => (
    getGeoJsonCoordinate(ride?.suggested_pickup) ||
    getGeoJsonCoordinate(ride?.suggestedPickup) ||
    getGeoJsonCoordinate(ride?.searchPickup) ||
    getGeoJsonCoordinate(ride?.origin)
  ), [ride]);

  /* -----------------------------------------------
     Drop-off coordinates
  ----------------------------------------------- */

  const dropoffCoordinate = useMemo(() => (
    getGeoJsonCoordinate(ride?.suggested_dropoff) ||
    getGeoJsonCoordinate(ride?.suggestedDropoff) ||
    getGeoJsonCoordinate(ride?.searchDropoff) ||
    getGeoJsonCoordinate(ride?.destination)
  ), [ride]);

  /* -----------------------------------------------
     Full route coordinates
  ----------------------------------------------- */

  const fullRouteCoordinates = useMemo(() => {
    const segment =
      ride?.matched_route_segment ||
      ride?.matchedRouteSegment ||
      ride?.geometry ||
      ride?.route_geometry ||
      ride?.rawRide?.geometry;

    const coords = getRouteCoordinates(segment);

    if (coords.length >= 2) return coords;

    if (pickupCoordinate && dropoffCoordinate) {
      return [pickupCoordinate, dropoffCoordinate];
    }

    return [];
  }, [ride, pickupCoordinate, dropoffCoordinate]);

  const activeCoordinate =
    selectedLocation === 'pickup'
      ? pickupCoordinate
      : dropoffCoordinate;

  /* -----------------------------------------------
     Load driver and vehicle information
  ----------------------------------------------- */

  useEffect(() => {
    let isMounted = true;

    const loadDriverVehicle = async () => {
      if (!driverID || !vehicleID) {
        setDetailsError(
          'Driver or vehicle identifier is not available.'
        );
        setDetailsLoading(false);
        return;
      }

      try {
        setDetailsLoading(true);
        setDetailsError('');

        const data = await getDriverVehicleDetails(
          driverID,
          vehicleID
        );

        if (!isMounted) return;

        setVehicle(data?.vehicle || null);
        setDriver(data?.driver || null);
      } catch (error) {
        if (!isMounted) return;

        setDetailsError(
          error.message || 'Could not load vehicle details.'
        );
      } finally {
        if (isMounted) setDetailsLoading(false);
      }
    };

    loadDriverVehicle();

    return () => {
      isMounted = false;
    };
  }, [driverID, vehicleID]);

  /* -----------------------------------------------
     Fit full route map
  ----------------------------------------------- */

  useEffect(() => {
    if (!showMore || fullRouteCoordinates.length < 2) return;

    const timer = setTimeout(() => {
      fullRouteMapRef.current?.fitToCoordinates(
        fullRouteCoordinates,
        {
          edgePadding: {
            top: 60,
            right: 50,
            bottom: 60,
            left: 50,
          },
          animated: true,
        }
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [showMore, fullRouteCoordinates]);

  /* -----------------------------------------------
     Missing ride
  ----------------------------------------------- */

  if (!ride) {
    return (
      <View style={styles.errorScreen}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.error}
        />

        <Text style={styles.errorTitle}>
          Ride details unavailable
        </Text>

        <Text style={styles.errorMessage}>
          We could not find the selected ride information.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* =====================================================
     NORMALIZE RIDE DATA
  ===================================================== */

  const currency = ride.currency || 'Rs';

  const pricePerSeat = Number(
    ride.price_per_seat ??
    ride.pricePerSeat ??
    ride.price ??
    0
  );

  const availableSeats =
    ride.available_seats ??
    ride.availableSeats ??
    ride.seatsFree ??
    ride.seats ??
    '—';

  const originName =
    ride.origin_name ||
    (typeof ride.origin === 'string'
      ? ride.origin
      : ride.origin?.name || ride.origin?.placeName) ||
    ride.from ||
    'Origin unavailable';

  const destinationName =
    ride.destination_name ||
    (typeof ride.destination === 'string'
      ? ride.destination
      : ride.destination?.name || ride.destination?.placeName) ||
    ride.to ||
    'Destination unavailable';

  const departureDateString = formatDeparture(
    ride.departure_at ||
    ride.departureAt ||
    (
      ride.departureDate && ride.departureTime
        ? `${ride.departureDate}T${ride.departureTime}`
        : null
    ) ||
    (
      ride.date && ride.departureTime
        ? `${ride.date}T${ride.departureTime}`
        : null
    ) ||
    ride.departureDate ||
    ride.date
  );

  const fullRouteDistance =
    ride.full_route_distance_meters ??
    ride.fullRouteDistanceMeters ??
    ride.distanceMeters ??
    ride.distance;

  const fullRouteDuration =
    ride.full_route_duration_seconds ??
    ride.fullRouteDurationSeconds ??
    ride.durationSeconds ??
    (ride.durationMin ? ride.durationMin * 60 : undefined);

  const yourRideDistance =
    ride.ride_distance_meters ??
    ride.rideDistanceMeters ??
    fullRouteDistance;

  const pickupDistance =
    ride.pickup_distance_meters ??
    ride.pickupDistanceMeters ??
    0;

  const dropoffDistance =
    ride.dropoff_distance_meters ??
    ride.dropoffDistanceMeters ??
    0;

  const driverName =
    driver?.name ||
    ride.driver?.name ||
    ride.driver_name ||
    'Driver';

  const driverVerification =
    driver?.verificationStatus ||
    (ride.driver?.verified ? 'verified' : 'pending');

  const vehicleName =
    [vehicle?.brand, vehicle?.model]
      .filter(Boolean)
      .join(' ') ||
    vehicle?.vehicleType ||
    'Vehicle';

  const airConditioning =
    typeof vehicle?.airConditioning === 'boolean'
      ? vehicle.airConditioning
        ? 'Available'
        : 'Not available'
      : 'Not available';

  /* =====================================================
     BOOKING ACTION
  ===================================================== */

  const handleBookRide = () => {
    // Change '/booking' to your actual booking screen route.
    // The selected ride is passed to the next screen.
    router.push({
      pathname: '/booking',
      params: {
        ride: JSON.stringify(ride),
      },
    });
  };

  /* =====================================================
     UI
  ===================================================== */

return (
  <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background}
      />

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Ride Details
        </Text>

        <View style={styles.headerPlaceholder}>
          <Ionicons
            name="shield-checkmark-outline"
            size={21}
            color={colors.primary}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ==========================================
            1. RIDE OVERVIEW
        ========================================== */}

        <View style={styles.heroCard}>
          <View style={styles.priceHeader}>
            <View>
              <Text style={styles.priceLabel}>
                PRICE PER SEAT
              </Text>

              <View style={styles.priceLine}>
                <Text style={styles.price}>
                  {currency} {pricePerSeat.toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.seatsBadge}>
              <Ionicons
                name="people"
                size={16}
                color={colors.primary}
              />

              <Text style={styles.seatsText}>
                {availableSeats} seats
              </Text>
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
                <Text style={styles.locationLabel}>
                  PICKUP / ORIGIN
                </Text>

                <Text style={styles.locationName}>
                  {originName}
                </Text>
              </View>

              <View style={styles.destinationBlock}>
                <Text style={styles.locationLabel}>
                  DROP-OFF / DESTINATION
                </Text>

                <Text style={styles.locationName}>
                  {destinationName}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.departureRow}>
            <View style={styles.departureIcon}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={colors.primary}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.departureLabel}>
                DEPARTURE
              </Text>

              <Text style={styles.departureText}>
                {departureDateString}
              </Text>
            </View>
          </View>
        </View>

        {/* ==========================================
            2. DRIVER INFORMATION
        ========================================== */}

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
                <Ionicons
                  name="person"
                  size={28}
                  color={colors.primary}
                />
              </View>

              <View style={styles.driverText}>
                <Text style={styles.driverName}>
                  {driverName}
                </Text>

                <View style={styles.verificationBadge}>
                  <Ionicons
                    name={
                      String(driverVerification).toLowerCase() === 'verified'
                        ? 'checkmark-circle'
                        : 'time-outline'
                    }
                    size={14}
                    color={colors.primary}
                  />

                  <Text style={styles.driverStatus}>
                    {driverVerification}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* ==========================================
            3. VEHICLE PREVIEW
        ========================================== */}

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
                <Image
                  source={{ uri: vehicle.vehiclePhotoUrl }}
                  style={styles.vehicleImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.vehicleImageFallback}>
                  <Ionicons
                    name="car-sport-outline"
                    size={48}
                    color={colors.primary}
                  />

                  <Text style={styles.fallbackText}>
                    Vehicle photo unavailable
                  </Text>
                </View>
              )}

              <Text style={styles.vehicleName}>
                {vehicleName}
              </Text>

              <View style={styles.vehicleTypeBadge}>
                <Ionicons
                  name="car-outline"
                  size={15}
                  color={colors.primary}
                />

                <Text style={styles.vehicleTypeText}>
                  {vehicle.vehicleType || 'Vehicle'}
                </Text>
              </View>

              <View style={styles.vehicleQuickInfo}>
                <View style={styles.quickInfoItem}>
                  <Ionicons
                    name="people-outline"
                    size={17}
                    color={colors.primary}
                  />

                  <Text style={styles.quickInfoText}>
                    {vehicle.passengerSeats ?? '—'} seats
                  </Text>
                </View>

                <View style={styles.quickInfoItem}>
                  <Ionicons
                    name="snow-outline"
                    size={17}
                    color={colors.primary}
                  />

                  <Text style={styles.quickInfoText}>
                    AC {airConditioning === 'Available' ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <Text style={styles.fallbackText}>
              Vehicle information is not available.
            </Text>
          )}
        </View>

        {/* ==========================================
            4. SEE MORE DETAILS BUTTON
        ========================================== */}

        <TouchableOpacity
          style={styles.expandButton}
          activeOpacity={0.8}
          onPress={() => setShowMore((previous) => !previous)}
        >
          <View style={styles.expandButtonLeft}>
            <View style={styles.expandIcon}>
              <Ionicons
                name="information-circle-outline"
                size={21}
                color={colors.primary}
              />
            </View>

            <View>
              <Text style={styles.expandTitle}>
                {showMore ? 'Show less' : 'Explore more details'}
              </Text>

              <Text style={styles.expandSubtitle}>
                {showMore
                  ? 'Hide additional information'
                  : 'Journey, maps and complete vehicle details'}
              </Text>
            </View>
          </View>

          <Ionicons
            name={showMore ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>

        {/* ==========================================
            5. EXPANDED DETAILS
        ========================================== */}

        {showMore && (
          <View>

            {/* Journey statistics */}

            <View style={styles.card}>
              <SectionTitle
                title="Journey information"
                subtitle="Distance and travel estimates"
                icon="analytics-outline"
              />

              <DetailRow
                icon="map-outline"
                label="Full route distance"
                value={formatDistance(fullRouteDistance)}
              />

              <DetailRow
                icon="time-outline"
                label="Full route duration"
                value={formatDuration(fullRouteDuration)}
              />

              <DetailRow
                icon="navigate-outline"
                label="Your ride distance"
                value={formatDistance(yourRideDistance)}
              />

              <DetailRow
                icon="location-outline"
                label="Pickup distance from route"
                value={formatDistance(pickupDistance)}
              />

              <DetailRow
                icon="flag-outline"
                label="Drop-off distance from route"
                value={formatDistance(dropoffDistance)}
              />
            </View>

            {/* Pickup and drop-off map */}

            <View style={styles.card}>
              <SectionTitle
                title="Pickup and drop-off"
                subtitle="Check your suggested locations"
                icon="location-outline"
              />

              <View style={styles.locationTabs}>
                <TouchableOpacity
                  style={[
                    styles.locationTab,
                    selectedLocation === 'pickup' &&
                      styles.activeLocationTab,
                  ]}
                  onPress={() => setSelectedLocation('pickup')}
                >
                  <Ionicons
                    name="location"
                    size={17}
                    color={
                      selectedLocation === 'pickup'
                        ? colors.white
                        : colors.primary
                    }
                  />

                  <Text
                    style={[
                      styles.locationTabText,
                      selectedLocation === 'pickup' &&
                        styles.activeLocationTabText,
                    ]}
                  >
                    Pickup
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.locationTab,
                    selectedLocation === 'dropoff' &&
                      styles.activeLocationTab,
                  ]}
                  onPress={() => setSelectedLocation('dropoff')}
                >
                  <Ionicons
                    name="flag"
                    size={17}
                    color={
                      selectedLocation === 'dropoff'
                        ? colors.white
                        : colors.primary
                    }
                  />

                  <Text
                    style={[
                      styles.locationTabText,
                      selectedLocation === 'dropoff' &&
                        styles.activeLocationTabText,
                    ]}
                  >
                    Drop-off
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.mapContainer}>
                {activeCoordinate ? (
                  <MapView
                    key={selectedLocation}
                    style={styles.map}
                    initialRegion={{
                      ...activeCoordinate,
                      latitudeDelta: 0.025,
                      longitudeDelta: 0.025,
                    }}
                  >
                    <Marker
                      coordinate={activeCoordinate}
                      title={
                        selectedLocation === 'pickup'
                          ? 'Pickup location'
                          : 'Drop-off location'
                      }
                      pinColor={
                        selectedLocation === 'pickup'
                          ? colors.primary
                          : colors.accent
                      }
                    />
                  </MapView>
                ) : (
                  <View style={styles.mapFallback}>
                    <Ionicons
                      name="location-outline"
                      size={35}
                      color={colors.primary}
                    />

                    <Text style={styles.fallbackText}>
                      {selectedLocation === 'pickup'
                        ? 'Pickup location is unavailable.'
                        : 'Drop-off location is unavailable.'}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.mapCaption}>
                {selectedLocation === 'pickup'
                  ? 'Showing the suggested pickup coordinate.'
                  : 'Showing the suggested drop-off coordinate.'}
              </Text>
            </View>

            {/* Full driver route */}

            <View style={styles.card}>
              <SectionTitle
                title="Full driver route"
                subtitle="The complete route followed by the driver"
                icon="map-outline"
              />

              <View style={styles.mapContainer}>
                {fullRouteCoordinates.length >= 2 ? (
                  <MapView
                    ref={fullRouteMapRef}
                    style={styles.map}
                    initialRegion={{
                      ...fullRouteCoordinates[0],
                      latitudeDelta: 1,
                      longitudeDelta: 1,
                    }}
                  >
                    <Polyline
                      coordinates={fullRouteCoordinates}
                      strokeColor={colors.primary}
                      strokeWidth={5}
                    />

                    <Marker
                      coordinate={fullRouteCoordinates[0]}
                      title="Route start"
                      pinColor="#16A36A"
                    />

                    <Marker
                      coordinate={
                        fullRouteCoordinates[
                          fullRouteCoordinates.length - 1
                        ]
                      }
                      title="Route destination"
                      pinColor={colors.primary}
                    />
                  </MapView>
                ) : (
                  <View style={styles.mapFallback}>
                    <Ionicons
                      name="map-outline"
                      size={35}
                      color={colors.primary}
                    />

                    <Text style={styles.fallbackText}>
                      Full route geometry is unavailable.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* COMPLETE VEHICLE INFORMATION */}

            <View style={styles.card}>
              <SectionTitle
                title="Complete vehicle details"
                subtitle="All available vehicle specifications"
                icon="car-sport-outline"
              />

              {detailsLoading ? (
                <LoadingSection />
              ) : vehicle ? (
                <>
                  <Text style={styles.vehicleName}>
                    {vehicleName}
                  </Text>

                  <DetailRow
                    icon="car-outline"
                    label="Vehicle type"
                    value={vehicle.vehicleType}
                  />

                  <DetailRow
                    icon="business-outline"
                    label="Brand"
                    value={vehicle.brand}
                  />

                  <DetailRow
                    icon="pricetag-outline"
                    label="Model"
                    value={vehicle.model}
                  />

                  <DetailRow
                    icon="calendar-outline"
                    label="Year"
                    value={vehicle.year}
                  />

                  <DetailRow
                    icon="color-palette-outline"
                    label="Color"
                    value={vehicle.color}
                  />

                  <DetailRow
                    icon="people-outline"
                    label="Passenger seats"
                    value={vehicle.passengerSeats}
                  />

                  <DetailRow
                    icon="snow-outline"
                    label="Air conditioning"
                    value={airConditioning}
                  />

                  <DetailRow
                    icon="briefcase-outline"
                    label="Luggage space"
                    value={vehicle.luggageSpace}
                  />

                  {vehicle.vehicleDescription ? (
                    <View style={styles.descriptionContainer}>
                      <View style={styles.detailLeft}>
                        <Ionicons
                          name="document-text-outline"
                          size={18}
                          color={colors.primary}
                        />

                        <Text style={styles.detailLabel}>
                          Vehicle description
                        </Text>
                      </View>

                      <Text style={styles.vehicleDescription}>
                        {vehicle.vehicleDescription}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.fallbackText}>
                  Vehicle information is not available.
                </Text>
              )}
            </View>

          </View>
        )}

        {/* API ERROR */}

        {detailsError ? (
          <View style={styles.errorNotice}>
            <Ionicons
              name="alert-circle-outline"
              size={19}
              color={colors.error}
            />

            <Text style={styles.errorNoticeText}>
              {detailsError}
            </Text>
          </View>
        ) : null}

        <View style={styles.bottomSpace} />
      </ScrollView>

      {/* ==========================================
          FIXED BOOKING BUTTON
      ========================================== */}

      <View style={styles.bookingContainer}>
        <View style={styles.bookingPrice}>
          <Text style={styles.bookingPriceLabel}>
            PRICE PER SEAT
          </Text>

          <Text style={styles.bookingPriceValue}>
            {currency} {pricePerSeat.toLocaleString()}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.bookButton,
            Number(availableSeats) <= 0 && styles.disabledBookButton,
          ]}
          onPress={handleBookRide}
          activeOpacity={0.85}
          disabled={
            Number.isFinite(Number(availableSeats)) &&
            Number(availableSeats) <= 0
          }
        >
          <Text style={styles.bookButtonText}>
            {Number.isFinite(Number(availableSeats)) &&
            Number(availableSeats) <= 0
              ? 'No Seats Available'
              : 'Book This Ride'}
          </Text>

          <Ionicons
            name="arrow-forward"
            size={19}
            color={colors.white}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
