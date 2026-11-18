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
import styles from '../theme/ride-details.styles';

const formatDistance = (meters) => {
  const value = Number(meters);

  if (!Number.isFinite(value)) return 'Not available';

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`;
  }

  return `${Math.round(value)} m`;
};

const formatDuration = (seconds) => {
  const value = Number(seconds);

  if (!Number.isFinite(value)) return 'Not available';

  const hours = Math.floor(value / 3600);
  const minutes = Math.round((value % 3600) / 60);

  if (hours === 0) return `${minutes} min`;

  return `${hours} hr ${minutes} min`;
};

const formatDeparture = (date) => {
  if (!date) return 'Not available';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return 'Not available';

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
  const coordinates = point?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
};

const getRouteCoordinates = (routeSegment) => {
  const coordinates = routeSegment?.coordinates;

  if (!Array.isArray(coordinates)) return [];

  return coordinates
    .map((coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) {
        return null;
      }

      const longitude = Number(coordinate[0]);
      const latitude = Number(coordinate[1]);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return { latitude, longitude };
    })
    .filter(Boolean);
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value ?? 'Not available'}</Text>
  </View>
);

const SectionTitle = ({ title }) => (
  <Text style={styles.sectionTitle}>{title}</Text>
);

const LoadingSection = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="small" color="#0F4C81" />
    <Text style={styles.loadingText}>Loading details...</Text>
  </View>
);

export default function RideDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const fullRouteMapRef = useRef(null);

  const [selectedLocation, setSelectedLocation] = useState('pickup');

  const [vehicle, setVehicle] = useState(null);
  const [driver, setDriver] = useState(null);

  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState('');

  const ride = useMemo(() => {
    try {
      const rawRide = Array.isArray(params.ride)
        ? params.ride[0]
        : params.ride;

      return rawRide ? JSON.parse(rawRide) : null;
    } catch {
      return null;
    }
  }, [params.ride]);

  const pickupCoordinate = useMemo(
    () => getGeoJsonCoordinate(ride?.suggested_pickup),
    [ride]
  );

  const dropoffCoordinate = useMemo(
    () => getGeoJsonCoordinate(ride?.suggested_dropoff),
    [ride]
  );

  const fullRouteCoordinates = useMemo(
    () => getRouteCoordinates(ride?.matched_route_segment),
    [ride]
  );

  const activeCoordinate =
    selectedLocation === 'pickup'
      ? pickupCoordinate
      : dropoffCoordinate;

  useEffect(() => {
    let isMounted = true;

    const loadDriverVehicle = async () => {
      if (!ride?.driver_id || !ride?.vehicle_id) {
        setDetailsError('Driver or vehicle information is unavailable.');
        setDetailsLoading(false);
        return;
      }

      try {
        setDetailsLoading(true);
        setDetailsError('');

        const data = await getDriverVehicleDetails(
          ride.driver_id,
          ride.vehicle_id
        );

        if (!isMounted) return;

        setVehicle(data.vehicle || null);
        setDriver(data.driver || null);
      } catch (error) {
        if (!isMounted) return;
        setDetailsError(error.message);
      } finally {
        if (isMounted) setDetailsLoading(false);
      }
    };

    loadDriverVehicle();

    return () => {
      isMounted = false;
    };
  }, [ride?.driver_id, ride?.vehicle_id]);

  useEffect(() => {
    if (fullRouteCoordinates.length < 2) return;

    const timer = setTimeout(() => {
      fullRouteMapRef.current?.fitToCoordinates(fullRouteCoordinates, {
        edgePadding: {
          top: 60,
          right: 50,
          bottom: 60,
          left: 50,
        },
        animated: true,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [fullRouteCoordinates]);

  if (!ride) {
    return (
      <View style={styles.errorScreen}>
        <Ionicons name="alert-circle-outline" size={45} color="#D9534F" />
        <Text style={styles.errorTitle}>Ride details unavailable</Text>
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

  const currency = ride.currency || 'LKR';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={23} color="#172B4D" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Ride Details</Text>

        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Journey overview */}
        <View style={styles.card}>
          <View style={styles.priceHeader}>
            <View>
              <Text style={styles.priceLabel}>Price per seat</Text>
              <Text style={styles.price}>
                {currency} {Number(ride.price_per_seat || 0).toLocaleString()}
              </Text>
            </View>

            <View style={styles.seatsBadge}>
              <Ionicons name="people-outline" size={16} color="#0F4C81" />
              <Text style={styles.seatsText}>
                {ride.available_seats ?? '—'} seats available
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
                <Text style={styles.locationLabel}>FROM</Text>
                <Text style={styles.locationName}>
                  {ride.origin_name || 'Origin unavailable'}
                </Text>
              </View>

              <View style={styles.destinationBlock}>
                <Text style={styles.locationLabel}>TO</Text>
                <Text style={styles.locationName}>
                  {ride.destination_name || 'Destination unavailable'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.departureRow}>
            <Ionicons name="calendar-outline" size={19} color="#0F4C81" />
            <Text style={styles.departureText}>
              {formatDeparture(ride.departure_at)}
            </Text>
          </View>
        </View>

        {/* Journey statistics */}
        <View style={styles.card}>
          <SectionTitle title="Journey information" />

          <DetailRow
            label="Full route distance"
            value={formatDistance(ride.full_route_distance_meters)}
          />

          <DetailRow
            label="Full route duration"
            value={formatDuration(ride.full_route_duration_seconds)}
          />

          <DetailRow
            label="Your ride distance"
            value={formatDistance(ride.ride_distance_meters)}
          />

          <DetailRow
            label="Pickup distance from route"
            value={formatDistance(ride.pickup_distance_meters)}
          />

          <DetailRow
            label="Drop-off distance from route"
            value={formatDistance(ride.dropoff_distance_meters)}
          />
        </View>

        {/* Pickup and drop-off map */}
        <View style={styles.card}>
          <SectionTitle title="Pickup and drop-off locations" />

          <View style={styles.locationTabs}>
            <TouchableOpacity
              style={[
                styles.locationTab,
                selectedLocation === 'pickup' && styles.activeLocationTab,
              ]}
              onPress={() => setSelectedLocation('pickup')}
            >
              <Ionicons
                name="location"
                size={17}
                color={selectedLocation === 'pickup' ? '#FFFFFF' : '#526477'}
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
                selectedLocation === 'dropoff' && styles.activeLocationTab,
              ]}
              onPress={() => setSelectedLocation('dropoff')}
            >
              <Ionicons
                name="flag"
                size={17}
                color={selectedLocation === 'dropoff' ? '#FFFFFF' : '#526477'}
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
                region={{
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
                    selectedLocation === 'pickup' ? '#0F4C81' : '#F5A623'
                  }
                />
              </MapView>
            ) : (
              <View style={styles.mapFallback}>
                <Ionicons name="location-outline" size={35} color="#8A99A8" />
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

        {/* Full route map */}
        <View style={styles.card}>
          <SectionTitle title="Full driver route" />

          <Text style={styles.mapDescription}>
            The complete route provided by the ride search result.
          </Text>

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
                  strokeColor="#0F4C81"
                  strokeWidth={5}
                />

                <Marker
                  coordinate={fullRouteCoordinates[0]}
                  title="Route start"
                  pinColor="#16A36A"
                />

                <Marker
                  coordinate={
                    fullRouteCoordinates[fullRouteCoordinates.length - 1]
                  }
                  title="Route destination"
                  pinColor="#D9534F"
                />
              </MapView>
            ) : (
              <View style={styles.mapFallback}>
                <Ionicons
                  name="map-outline"
                  size={35}
                  color="#8A99A8"
                />
                <Text style={styles.fallbackText}>
                  Full route geometry is unavailable.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Driver information */}
        <View style={styles.card}>
          <SectionTitle title="Driver information" />

          {detailsLoading ? (
            <LoadingSection />
          ) : driver ? (
            <View style={styles.driverInfo}>
              <View style={styles.driverIcon}>
                <Ionicons name="person-outline" size={27} color="#0F4C81" />
              </View>

              <View style={styles.driverText}>
                <Text style={styles.driverName}>Driver</Text>
                <Text style={styles.driverStatus}>
                  Verification: {driver.verificationStatus || 'Not available'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.fallbackText}>
              Driver information is not available.
            </Text>
          )}
        </View>

        {/* Vehicle information */}
        <View style={styles.card}>
          <SectionTitle title="Vehicle information" />

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
                    name="car-outline"
                    size={45}
                    color="#8A99A8"
                  />
                  <Text style={styles.fallbackText}>
                    Vehicle photo unavailable
                  </Text>
                </View>
              )}

              <Text style={styles.vehicleName}>
                {[vehicle.brand, vehicle.model].filter(Boolean).join(' ') ||
                  'Vehicle'}
              </Text>

              <DetailRow
                label="Vehicle type"
                value={vehicle.vehicleType}
              />

              <DetailRow label="Year" value={vehicle.year} />

              <DetailRow label="Color" value={vehicle.color} />

              <DetailRow
                label="Passenger seats"
                value={vehicle.passengerSeats}
              />

              <DetailRow
                label="Air conditioning"
                value={
                  typeof vehicle.airConditioning === 'boolean'
                    ? vehicle.airConditioning
                      ? 'Available'
                      : 'Not available'
                    : 'Not available'
                }
              />

              <DetailRow
                label="Luggage space"
                value={vehicle.luggageSpace}
              />

              {vehicle.vehicleDescription ? (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.detailLabel}>Description</Text>
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

        {detailsError ? (
          <View style={styles.errorNotice}>
            <Ionicons
              name="alert-circle-outline"
              size={18}
              color="#B54745"
            />
            <Text style={styles.errorNoticeText}>{detailsError}</Text>
          </View>
        ) : null}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}