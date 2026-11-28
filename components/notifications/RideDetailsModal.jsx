
import React, { useEffect, useState } from 'react';

import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { fetchRideDetails } from '../../services/rideDetailsService';

export default function RideDetailsModal({
  visible,
  rideId,
  onClose,
}) {
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible || !rideId) return;

    let isActive = true;

    async function loadRide() {
      setLoading(true);
      setError(null);
      setRide(null);

      try {
        const result = await fetchRideDetails(rideId);

        if (isActive) {
          setRide(result);
        }
      } catch (err) {
        if (isActive) {
          setError(err.message || 'Unable to load ride details.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    loadRide();

    return () => {
      isActive = false;
    };
  }, [visible, rideId]);

  const formatDate = (value) => {
    if (!value) return 'Not available';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString();
  };

  const formatDistance = (meters) => {
    if (meters == null) return 'Not available';

    return meters >= 1000
      ? `${(meters / 1000).toFixed(1)} km`
      : `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds) => {
    if (seconds == null) return 'Not available';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours === 0) return `${minutes} min`;

    return `${hours} hr ${minutes} min`;
  };

  const formatPrice = () => {
    if (ride?.price_per_seat == null) {
      return 'Not available';
    }

    return `${ride.currency || ''} ${ride.price_per_seat}`.trim();
  };

  const renderInfo = (icon, label, value) => (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={19} color="#6256D9" />
      </View>

      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>
          {value ?? 'Not available'}
        </Text>
      </View>
    </View>
  );

  const preferences =
    ride?.ride_preferences &&
    typeof ride.ride_preferences === 'object'
      ? Object.entries(ride.ride_preferences)
      : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <View style={styles.modalContainer}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>
                Ride Details
              </Text>
              <Text style={styles.headerSubtitle}>
                Published ride information
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={23} color="#303548" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#6256D9" />
              <Text style={styles.stateText}>
                Loading ride details...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.centerState}>
              <Ionicons
                name="alert-circle-outline"
                size={45}
                color="#DC5252"
              />

              <Text style={styles.errorTitle}>
                Unable to load ride
              </Text>

              <Text style={styles.stateText}>
                {error}
              </Text>

              <TouchableOpacity
                style={styles.closeAction}
                onPress={onClose}
              >
                <Text style={styles.closeActionText}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          ) : ride ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.statusRow}>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>
                    {ride.status || 'PUBLISHED'}
                  </Text>
                </View>

                <Text style={styles.rideId}>
                  Ride #{String(ride.route_id).slice(-6)}
                </Text>
              </View>

              <View style={styles.routeCard}>
                <View style={styles.routeLocation}>
                  <View style={styles.originDot} />
                  <View style={styles.routeLocationText}>
                    <Text style={styles.routeLabel}>
                      FROM
                    </Text>
                    <Text style={styles.routeName}>
                      {ride.origin_name}
                    </Text>
                  </View>
                </View>

                <View style={styles.routeConnector} />

                <View style={styles.routeLocation}>
                  <View style={styles.destinationDot} />
                  <View style={styles.routeLocationText}>
                    <Text style={styles.routeLabel}>
                      TO
                    </Text>
                    <Text style={styles.routeName}>
                      {ride.destination_name}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>
                Travel Information
              </Text>

              <View style={styles.infoGrid}>
                {renderInfo(
                  'calendar-outline',
                  'Departure',
                  formatDate(ride.departure_at)
                )}

                {renderInfo(
                  'people-outline',
                  'Available seats',
                  ride.available_seats
                )}

                {renderInfo(
                  'wallet-outline',
                  'Price per seat',
                  formatPrice()
                )}

                {renderInfo(
                  'navigate-outline',
                  'Distance',
                  formatDistance(ride.distance_meters)
                )}

                {renderInfo(
                  'time-outline',
                  'Estimated duration',
                  formatDuration(ride.duration_seconds)
                )}

                {renderInfo(
                  'hourglass-outline',
                  'Waiting time',
                  ride.max_passenger_waiting_minutes != null
                    ? `${ride.max_passenger_waiting_minutes} minutes`
                    : 'Not available'
                )}
              </View>

              <Text style={styles.sectionTitle}>
                Intermediate Stops
              </Text>

              {ride.intermediate_stops?.length > 0 ? (
                <View style={styles.stopsCard}>
                  {ride.intermediate_stops.map((stop, index) => (
                    <View
                      key={stop.stopId || index}
                      style={styles.stopRow}
                    >
                      <Ionicons
                        name="location-outline"
                        size={19}
                        color="#6256D9"
                      />

                      <View style={styles.stopContent}>
                        <Text style={styles.stopName}>
                          {stop.location || 'Unnamed stop'}
                        </Text>

                        {stop.reason ? (
                          <Text style={styles.stopDescription}>
                            {stop.reason}
                          </Text>
                        ) : null}

                        {stop.description ? (
                          <Text style={styles.stopDescription}>
                            {stop.description}
                          </Text>
                        ): null}
                    

                        {stop.arrivalTime ? (
                          <Text style={styles.stopDescription}>
                            Arrival: {formatDate(stop.arrivalTime)}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  No intermediate stops.
                </Text>
              )}

              <Text style={styles.sectionTitle}>
                Ride Preferences
              </Text>

              {preferences.length > 0 ? (
                <View style={styles.preferencesCard}>
                  {preferences.map(([key, value]) => (
                    <View key={key} style={styles.preferenceRow}>
                      <Text style={styles.preferenceLabel}>
                        {key.replace(/_/g, ' ')}
                      </Text>

                      <Text style={styles.preferenceValue}>
                        {typeof value === 'object'
                          ? JSON.stringify(value)
                          : String(value)}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>
                  No ride preferences available.
                </Text>
              )}

              <View style={styles.bottomSpace} />

              <TouchableOpacity
                style={styles.closeAction}
                onPress={onClose}
              >
                <Text style={styles.closeActionText}>
                  Close Details
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 24, 40, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 27,
    borderTopRightRadius: 27,
    maxHeight: '90%',
    minHeight: '45%',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
  },
  handle: {
    width: 42,
    height: 5,
    backgroundColor: '#D9DCE5',
    borderRadius: 5,
    alignSelf: 'center',
    marginBottom: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: '#202437',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#858B9B',
    marginTop: 4,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 20,
    backgroundColor: '#F1F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerState: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  stateText: {
    color: '#858B9B',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  errorTitle: {
    color: '#202437',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  scrollContent: {
    paddingBottom: 15,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8EF',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A36A',
    marginRight: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16865B',
  },
  rideId: {
    fontSize: 11,
    color: '#9299A8',
  },
  routeCard: {
    backgroundColor: '#F7F7FC',
    padding: 17,
    borderRadius: 16,
    marginBottom: 23,
  },
  routeLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6256D9',
    marginRight: 12,
  },
  destinationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#16A36A',
    marginRight: 12,
  },
  routeLocationText: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9299A8',
    letterSpacing: 1,
  },
  routeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#202437',
    marginTop: 3,
  },
  routeConnector: {
    height: 19,
    borderLeftWidth: 1.5,
    borderColor: '#C9C5EF',
    marginLeft: 5,
    marginVertical: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#202437',
    marginBottom: 13,
    marginTop: 5,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  infoItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    marginBottom: 17,
  },
  infoIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    backgroundColor: '#EFEDFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#9299A8',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#303548',
  },
  stopsCard: {
    backgroundColor: '#F7F7FC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stopContent: {
    flex: 1,
    marginLeft: 9,
  },
  stopName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#303548',
  },
  stopDescription: {
    fontSize: 11,
    color: '#858B9B',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 12,
    color: '#9299A8',
    marginBottom: 20,
  },
  preferencesCard: {
    backgroundColor: '#F7F7FC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    gap: 12,
  },
  preferenceLabel: {
    flex: 1,
    fontSize: 12,
    color: '#858B9B',
    textTransform: 'capitalize',
  },
  preferenceValue: {
    flex: 1,
    fontSize: 12,
    color: '#303548',
    fontWeight: '600',
    textAlign: 'right',
  },
  bottomSpace: {
    height: 8,
  },
  closeAction: {
    backgroundColor: '#6256D9',
    paddingVertical: 14,
    borderRadius: 13,
    alignItems: 'center',
    marginTop: 15,
  },
  closeActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
