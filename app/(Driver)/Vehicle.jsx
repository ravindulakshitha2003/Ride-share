
import React, { useState } from 'react';

import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import useVehicles from '../../hooks/useVehicles';
import colors from '../../theme/colors';

// -----------------------------------------------------------------------------
// DATE FORMATTER
// -----------------------------------------------------------------------------

function formatDate(value) {
  if (!value) return 'Not provided';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not provided';
  }

  return date.toLocaleDateString();
}

// -----------------------------------------------------------------------------
// LABEL FORMATTER
// -----------------------------------------------------------------------------

function formatLabel(value) {
  if (!value) return 'Not provided';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

// -----------------------------------------------------------------------------
// INFORMATION ROW
// -----------------------------------------------------------------------------

function InfoRow({ icon, label, value, last = false }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoDivider]}>
      <View style={styles.infoIcon}>
        <Icon
          name={icon}
          size={21}
          color={colors.primary}
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>
          {label}
        </Text>

        <Text style={styles.infoValue}>
          {value === null || value === undefined || value === ''
            ? 'Not provided'
            : String(value)}
        </Text>
      </View>
    </View>
  );
}

// -----------------------------------------------------------------------------
// VEHICLE CARD
// -----------------------------------------------------------------------------

function VehicleCard({ vehicle }) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const vehicleName = [
    vehicle.brand,
    vehicle.model,
  ]
    .filter(Boolean)
    .join(' ');

  // Supports both the mapped context object and raw backend object.
  const photoUrl = vehicle.photoUrl || vehicle.vehiclePhotoUrl;
  const plateNumber = vehicle.plate || vehicle.plateNumber;
  const vehicleType = vehicle.type || vehicle.vehicleType;
  const passengerSeats = vehicle.seats ?? vehicle.passengerSeats;
  const airConditioning = vehicle.hasAC ?? vehicle.airConditioning;
  const description = vehicle.description || vehicle.vehicleDescription;

  return (
    <View style={styles.vehicleCard}>

      {/* COMPACT VEHICLE INFORMATION */}

      <View style={styles.compactContent}>
        <View style={styles.vehicleImageWrapper}>
          {photoUrl && !imageError ? (
            <Image
              source={{ uri: photoUrl }}
              style={styles.vehicleImage}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon
                name="car"
                size={42}
                color={colors.primary}
              />
            </View>
          )}
        </View>

        <View style={styles.compactDetails}>
          <Text
            style={styles.vehicleName}
            numberOfLines={1}
          >
            {vehicleName || 'Vehicle'}
          </Text>

          <Text style={styles.vehicleSubtitle}>
            {formatLabel(vehicleType)} · {vehicle.year || 'Year unavailable'}
          </Text>

          <View style={styles.plateBadge}>
            <Icon
              name="card-account-details-outline"
              size={16}
              color={colors.secondary}
            />

            <Text style={styles.plateText}>
              {plateNumber || 'No plate number'}
            </Text>
          </View>
        </View>
      </View>

      {/* SEE MORE / SEE LESS */}

      <TouchableOpacity
        style={styles.seeMoreButton}
        activeOpacity={0.75}
        onPress={() => setExpanded((previous) => !previous)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Text style={styles.seeMoreText}>
          {expanded ? 'See less' : 'See more'}
        </Text>

        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={colors.primary}
        />
      </TouchableOpacity>

      {/* EXPANDED VEHICLE INFORMATION */}

      {expanded && (
        <View style={styles.expandedSection}>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Vehicle information
            </Text>
          </View>

          <InfoRow
            icon="car-outline"
            label="Vehicle type"
            value={formatLabel(vehicleType)}
          />

          <InfoRow
            icon="card-account-details-outline"
            label="Plate number"
            value={plateNumber}
          />

          <InfoRow
            icon="palette-outline"
            label="Colour"
            value={vehicle.color}
          />

          <InfoRow
            icon="calendar-outline"
            label="Manufacture year"
            value={vehicle.year}
          />

          <InfoRow
            icon="account-group-outline"
            label="Passenger seats"
            value={
              passengerSeats !== undefined && passengerSeats !== null
                ? `${passengerSeats} seats`
                : 'Not provided'
            }
          />

          <InfoRow
            icon="snowflake"
            label="Air conditioning"
            value={
              airConditioning
                ? 'Available'
                : 'Not available'
            }
          />

          <InfoRow
            icon="bag-suitcase-outline"
            label="Luggage space"
            value={formatLabel(vehicle.luggageSpace)}
          />

          <InfoRow
            icon="text"
            label="Vehicle description"
            value={description}
            last
          />

          {/* REGISTRATION DETAILS */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Registration details
            </Text>
          </View>

          <InfoRow
            icon="file-document-outline"
            label="CR number"
            value={vehicle.crNumber}
          />

          <InfoRow
            icon="calendar-check-outline"
            label="Revenue licence expiry"
            value={formatDate(vehicle.revenueLicenceExpiry)}
          />

          <InfoRow
            icon="shield-check-outline"
            label="Insurance expiry"
            value={formatDate(vehicle.insuranceExpiry)}
            last
          />

          {/* RECORD INFORMATION */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Record information
            </Text>
          </View>

          <InfoRow
            icon="clock-outline"
            label="Registered on"
            value={formatDate(vehicle.createdAt)}
          />

          <InfoRow
            icon="update"
            label="Last updated"
            value={formatDate(vehicle.updatedAt)}
            last
          />

        </View>
      )}
    </View>
  );
}

// -----------------------------------------------------------------------------
// VEHICLE DETAILS SCREEN
// -----------------------------------------------------------------------------

export default function VehicleDetailsScreen() {
  const insets = useSafeAreaInsets();

  const {
    vehicles,
    loading,
    error,
    refreshVehicles,
  } = useVehicles();

  // ---------------------------------------------------------------------------
  // COMMON SAFE AREA WRAPPER
  // ---------------------------------------------------------------------------

  const renderPage = (content) => (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'left', 'right']}
    >
      <LinearGradient
        colors={[
          colors.background,
          colors.gradientEnd,
        ]}
        style={styles.background}
      >
        {content}
      </LinearGradient>
    </SafeAreaView>
  );

  // ---------------------------------------------------------------------------
  // LOADING STATE
  // ---------------------------------------------------------------------------

  if (loading) {
    return renderPage(
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading vehicle details...
        </Text>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // ERROR STATE
  // ---------------------------------------------------------------------------

  if (error) {
    return renderPage(
      <View style={styles.center}>
        <View style={styles.emptyIcon}>
          <Icon
            name="alert-circle-outline"
            size={42}
            color={colors.primary}
          />
        </View>

        <Text style={styles.emptyTitle}>
          Unable to load vehicles
        </Text>

        <Text style={styles.emptyDescription}>
          {error}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={refreshVehicles}
          activeOpacity={0.8}
        >
          <Icon
            name="refresh"
            size={20}
            color={colors.white}
          />

          <Text style={styles.retryButtonText}>
            Try again
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // MAIN SCREEN
  // ---------------------------------------------------------------------------

  return renderPage(
    <View style={styles.screenContent}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom: Math.max(insets.bottom, 16) + 32,
          },
        ]}
      >

        {/* PAGE HEADING */}

        <View style={styles.topBar}>
          <View style={styles.topBarIcon}>
            <Icon
              name="car-outline"
              size={24}
              color={colors.primary}
            />
          </View>

          <View style={styles.headingContent}>
            <Text style={styles.topBarTitle}>
              Vehicle details
            </Text>

            <Text style={styles.topBarSubtitle}>
              Your registered vehicles
            </Text>
          </View>

          <TouchableOpacity
            style={styles.refreshIcon}
            onPress={refreshVehicles}
            activeOpacity={0.7}
            accessibilityLabel="Refresh vehicles"
          >
            <Icon
              name="refresh"
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        {/* EMPTY STATE */}

        {vehicles.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon
                name="car-off"
                size={42}
                color={colors.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              No vehicles found
            </Text>

            <Text style={styles.emptyDescription}>
              You haven't registered a vehicle yet.
            </Text>
          </View>
        ) : (

          /* VEHICLE LIST */

          <>
            <View style={styles.listHeading}>
              <Text style={styles.sectionTitle}>
                My vehicles
              </Text>

              <Text style={styles.vehicleCount}>
                {vehicles.length}{' '}
                {vehicles.length === 1 ? 'vehicle' : 'vehicles'}
              </Text>
            </View>

            {vehicles.map((vehicle) => (
              <VehicleCard
                key={vehicle.id || vehicle._id}
                vehicle={vehicle}
              />
            ))}
          </>
        )}

      </ScrollView>
    </View>
  );
}

// -----------------------------------------------------------------------------
// STYLES
// -----------------------------------------------------------------------------

const styles = StyleSheet.create({

  // SAFE AREA

  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  background: {
    flex: 1,
  },

  screenContent: {
    flex: 1,
  },

  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // CENTER CONTENT

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },

  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 16,
  },

  // TOP BAR

  topBar: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },

  topBarIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headingContent: {
    flex: 1,
  },

  topBarTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: colors.secondary,
  },

  topBarSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
  },

  refreshIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // LIST HEADING

  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.secondary,
  },

  vehicleCount: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // VEHICLE CARD

  vehicleCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: colors.primary,
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 4,
  },

  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },

  vehicleImageWrapper: {
    width: 112,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.tint,
  },

  vehicleImage: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.tint,
  },

  compactDetails: {
    flex: 1,
    minWidth: 0,
  },

  vehicleName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  vehicleSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 6,
  },

  plateBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.tint,
    borderRadius: 30,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 12,
  },

  plateText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: colors.secondary,
  },

  // EXPAND BUTTON

  seeMoreButton: {
    minHeight: 46,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  seeMoreText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },

  // EXPANDED INFORMATION

  expandedSection: {
    paddingTop: 8,
  },

  sectionHeader: {
    marginTop: 20,
    marginBottom: 8,
  },

  infoRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },

  infoDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoContent: {
    flex: 1,
    gap: 4,
  },

  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },

  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  // EMPTY STATE

  emptyCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 28,
    marginTop: 16,
  },

  emptyIcon: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 18,
  },

  // RETRY BUTTON

  retryButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },

  retryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
