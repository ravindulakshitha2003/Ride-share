/**
 * vehicle.jsx
 * ---------------------------------------------------------------------------
 * Registered vehicles page for the Share-Ride driver.
 * Place this file beside addVehical.jsx so both pages use the same imports.
 * Route: /vehicle
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import client from '../../api/client';

const C = {
  ...colors,
  status: {
    pending: colors.warning,
    approved: colors.success,
    rejected: colors.error,
    inactive: colors.grey,
    expired: colors.amber,
  },
};
const R = { sm: 12, md: 16, lg: 24, pill: 999 };
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const SHADOW = Platform.select({
  ios: {
    shadowColor: C.primary,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 6, shadowColor: C.primary },
  default: {},
});
const MAX_W = 560;
const FILTERS = ['All', 'Pending', 'Approved', 'Rejected', 'Inactive', 'Expired'];

function normalizeVehicle(vehicle) {
  const photo = vehicle.vehiclePhoto || vehicle.photoUrl || vehicle.vehiclePhotoUrl || vehicle.imageUrl || null;
  const photoUrl = typeof photo === 'string' ? photo : photo?.url || photo?.secure_url || null;
  return {
    ...vehicle,
    _id: vehicle._id || vehicle.id,
    type: vehicle.vehicleType || vehicle.type || '',
    make: vehicle.brand || vehicle.make || '',
    colour: vehicle.color || vehicle.colour || '',
    plateNo: vehicle.plateNumber || vehicle.plateNo || vehicle.plate || '',
    seats: vehicle.passengerSeats ?? vehicle.seats ?? 0,
    hasAC: vehicle.airConditioning ?? vehicle.hasAC ?? false,
    luggage: vehicle.luggageSpace || vehicle.luggage || '',
    crNumber: vehicle.crNumber || vehicle.registrationNumber || '',
    revenueLicenceExpiry: vehicle.revenueLicenceExpiry || vehicle.revenueLicenseExpiry || '',
    insuranceExpiry: vehicle.insuranceExpiry || '',
    photoUrl: photoUrl || vehicle.photoKeys?.[0] || null,
    status: vehicle.status || 'Pending',
  };
}

async function getVehicles() {
  const response = await client.get('/api/vehicles/me');
  const data = response.data;
  const list = Array.isArray(data) ? data : data?.vehicles || data?.data || [];
  return list.map(normalizeVehicle);
}

function GradientScreen({ children }) {
  return (
    <LinearGradient colors={[C.background, C.gradientEnd]} style={styles.flex}>
      <View pointerEvents="none" style={styles.glowA} />
      <View pointerEvents="none" style={styles.glowB} />
      {children}
    </LinearGradient>
  );
}

function StatusBadge({ status }) {
  const key = String(status || 'Pending').toLowerCase();
  const color = C.status[key] || C.status.inactive;
  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}1F` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{status || 'Pending'}</Text>
    </View>
  );
}

function FilterChip({ label, selected, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.filterChip, selected && styles.filterChipSelected]}>
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function InfoItem({ icon, label, value }) {
  return (
    <View style={styles.infoItem}>
      <View style={styles.infoIcon}>
        <Icon name={icon} size={18} color={C.primary} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={2}>{value || 'Not provided'}</Text>
      </View>
    </View>
  );
}

function VehicleCard({ vehicle, expanded, onToggle }) {
  return (
    <View style={styles.vehicleCard}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityLabel={`View ${vehicle.make} ${vehicle.model} details`}>
        {vehicle.photoUrl ? (
          <Image source={{ uri: vehicle.photoUrl }} style={styles.vehicleImage} resizeMode="cover" />
        ) : (
          <View style={[styles.vehicleImage, styles.imagePlaceholder]}>
            <Icon name="car-side" size={54} color={C.primary} />
            <Text style={styles.placeholderText}>No vehicle photo</Text>
          </View>
        )}
        <View style={styles.vehicleContent}>
          <View style={styles.vehicleTopRow}>
            <View style={styles.vehicleTitleWrap}>
              <Text style={styles.vehicleTitle} numberOfLines={1}>{vehicle.make || 'Vehicle'} {vehicle.model}</Text>
              <Text style={styles.vehicleSubtitle}>{[vehicle.year, vehicle.colour, vehicle.type].filter(Boolean).join('  ·  ')}</Text>
            </View>
            <StatusBadge status={vehicle.status} />
          </View>
          <View style={styles.plateRow}>
            <View style={styles.plateBadge}>
              <Icon name="card-account-details-outline" size={16} color={C.primary} />
              <Text style={styles.plateText}>{vehicle.plateNo || 'Plate not added'}</Text>
            </View>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color={C.textMuted} />
          </View>
          <View style={styles.quickFacts}>
            <View style={styles.factPill}><Icon name="seat-passenger" size={15} color={C.primary} /><Text style={styles.factText}>{vehicle.seats} seats</Text></View>
            <View style={styles.factPill}><Icon name="snowflake" size={15} color={C.primary} /><Text style={styles.factText}>{vehicle.hasAC ? 'A/C' : 'No A/C'}</Text></View>
            <View style={styles.factPill}><Icon name="bag-suitcase-outline" size={15} color={C.primary} /><Text style={styles.factText}>{vehicle.luggage || 'Luggage N/A'}</Text></View>
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.expandedArea}>
          <View style={styles.sectionDivider} />
          <Text style={styles.sectionHeading}>Vehicle information</Text>
          <View style={styles.infoGrid}>
            <InfoItem icon="car-info" label="Vehicle type" value={vehicle.type} />
            <InfoItem icon="palette-outline" label="Colour" value={vehicle.colour} />
            <InfoItem icon="account-group-outline" label="Passenger seats" value={String(vehicle.seats || 0)} />
            <InfoItem icon="snowflake" label="Air conditioning" value={vehicle.hasAC ? 'Available' : 'Not available'} />
            <InfoItem icon="bag-suitcase-outline" label="Luggage space" value={vehicle.luggage} />
            <InfoItem icon="file-document-outline" label="CR number" value={vehicle.crNumber} />
          </View>
          <Text style={[styles.sectionHeading, { marginTop: SP.lg }]}>Document expiry</Text>
          <View style={styles.expiryRow}>
            <View style={styles.expiryCopy}>
              <Text style={styles.expiryLabel}>Revenue licence</Text>
              <Text style={styles.expiryValue}>{vehicle.revenueLicenceExpiry || 'Not provided'}</Text>
            </View>
            <Icon name="calendar-check-outline" size={20} color={C.primary} />
          </View>
          <View style={styles.expiryRow}>
            <View style={styles.expiryCopy}>
              <Text style={styles.expiryLabel}>Insurance</Text>
              <Text style={styles.expiryValue}>{vehicle.insuranceExpiry || 'Not provided'}</Text>
            </View>
            <Icon name="shield-check-outline" size={20} color={C.primary} />
          </View>
          <Text style={styles.recordText}>Added {vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : 'date unavailable'}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function VehiclePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [filter, setFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadVehicles = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setVehicles(await getVehicles());
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Could not load your vehicles.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const counts = useMemo(() => ({
    All: vehicles.length,
    Pending: vehicles.filter((v) => String(v.status).toLowerCase() === 'pending').length,
    Approved: vehicles.filter((v) => String(v.status).toLowerCase() === 'approved').length,
    Rejected: vehicles.filter((v) => String(v.status).toLowerCase() === 'rejected').length,
    Inactive: vehicles.filter((v) => String(v.status).toLowerCase() === 'inactive').length,
    Expired: vehicles.filter((v) => String(v.status).toLowerCase() === 'expired').length,
  }), [vehicles]);

  const visibleVehicles = useMemo(() => filter === 'All'
    ? vehicles
    : vehicles.filter((v) => String(v.status).toLowerCase() === filter.toLowerCase()), [vehicles, filter]);

  return (
    <GradientScreen>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadVehicles(true)} tintColor={C.primary} colors={[C.primary]} />}
        >
          <View style={styles.shell}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
                <Icon name="arrow-left" size={23} color={C.text} />
              </Pressable>
              <View style={styles.headerTitleWrap}>
                <Text style={styles.eyebrow}>DRIVER GARAGE</Text>
                <Text style={styles.heading}>My vehicles</Text>
              </View>
              <Pressable onPress={() => router.push('/Addvehical')} style={styles.addIconButton} accessibilityRole="button" accessibilityLabel="Add a vehicle">
                <Icon name="plus" size={24} color={C.white} />
              </Pressable>
            </View>

            <Text style={styles.subtitle}>Manage your registered vehicles and keep their details up to date.</Text>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIcon}><Icon name="car-multiple" size={26} color={C.primary} /></View>
              <View style={styles.summaryCopy}>
                <Text style={styles.summaryNumber}>{vehicles.length}</Text>
                <Text style={styles.summaryLabel}>{vehicles.length === 1 ? 'Registered vehicle' : 'Registered vehicles'}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStatus}>
                <Text style={styles.summaryStatusNumber}>{counts.Approved}</Text>
                <Text style={styles.summaryStatusLabel}>Approved</Text>
              </View>
              <View style={styles.summaryStatus}>
                <Text style={styles.summaryStatusNumber}>{counts.Pending}</Text>
                <Text style={styles.summaryStatusLabel}>Pending</Text>
              </View>
            </View>

            <View style={styles.listHeadingRow}>
              <View>
                <Text style={styles.sectionTitle}>Your garage</Text>
                <Text style={styles.listCount}>{visibleVehicles.length} {visibleVehicles.length === 1 ? 'vehicle' : 'vehicles'} shown</Text>
              </View>
              <Pressable onPress={() => loadVehicles(true)} style={styles.refreshButton} accessibilityRole="button" accessibilityLabel="Refresh vehicles">
                <Icon name="refresh" size={19} color={C.primary} />
              </Pressable>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {FILTERS.map((item) => (
                <FilterChip key={item} label={`${item}  ${counts[item]}`} selected={filter === item} onPress={() => setFilter(item)} />
              ))}
            </ScrollView>

            {loading ? (
              <View style={styles.stateCard}><ActivityIndicator size="large" color={C.primary} /><Text style={styles.stateText}>Loading your vehicles...</Text></View>
            ) : error ? (
              <View style={styles.stateCard}>
                <View style={styles.stateIcon}><Icon name="alert-circle-outline" size={30} color={C.danger} /></View>
                <Text style={styles.stateTitle}>Unable to load vehicles</Text>
                <Text style={styles.stateText}>{error}</Text>
                <Pressable onPress={() => loadVehicles()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable>
              </View>
            ) : visibleVehicles.length === 0 ? (
              <View style={styles.stateCard}>
                <View style={styles.stateIcon}><Icon name="car-outline" size={34} color={C.primary} /></View>
                <Text style={styles.stateTitle}>{filter === 'All' ? 'Your garage is empty' : `No ${filter.toLowerCase()} vehicles`}</Text>
                <Text style={styles.stateText}>{filter === 'All' ? 'Add your first vehicle to start publishing rides.' : 'Try another status filter to see your vehicles.'}</Text>
                {filter === 'All' ? <Pressable onPress={() => router.push('/Addvehical')} style={styles.retryButton}><Text style={styles.retryText}>Add a vehicle</Text></Pressable> : null}
              </View>
            ) : (
              visibleVehicles.map((vehicle, index) => (
                <VehicleCard
                  key={vehicle._id || `${vehicle.plateNo}-${index}`}
                  vehicle={vehicle}
                  expanded={expandedId === vehicle._id}
                  onToggle={() => setExpandedId((current) => current === vehicle._id ? null : vehicle._id)}
                />
              ))
            )}

            <Pressable onPress={() => router.push('/Addvehical')} style={styles.addVehicleButton}>
              <Icon name="plus-circle-outline" size={21} color={C.white} />
              <Text style={styles.addVehicleText}>Add another vehicle</Text>
            </Pressable>
            <View style={{ height: SP.xxxl }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  glowA: { position: 'absolute', top: -80, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: C.accent, opacity: 0.28 },
  glowB: { position: 'absolute', bottom: 120, left: -100, width: 220, height: 220, borderRadius: 110, backgroundColor: C.primary, opacity: 0.1 },
  scrollContent: { paddingBottom: SP.xxl },
  shell: { width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: 20 },
  headerRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', ...SHADOW },
  headerTitleWrap: { flex: 1, marginLeft: SP.md },
  eyebrow: { fontSize: 10, letterSpacing: 1.5, fontWeight: '800', color: C.secondary },
  heading: { fontSize: 27, lineHeight: 32, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  addIconButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW },
  subtitle: { fontSize: 14, lineHeight: 21, color: C.textMuted, marginTop: SP.md, marginBottom: SP.xl },
  summaryCard: { backgroundColor: C.surface, borderRadius: R.lg, padding: SP.lg, flexDirection: 'row', alignItems: 'center', ...SHADOW },
  summaryIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1, marginLeft: SP.md },
  summaryNumber: { fontSize: 26, lineHeight: 30, fontWeight: '800', color: C.text },
  summaryLabel: { fontSize: 11, color: C.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, height: 42, backgroundColor: C.borderSubtle, marginHorizontal: SP.md },
  summaryStatus: { alignItems: 'center', minWidth: 48 },
  summaryStatusNumber: { fontSize: 19, fontWeight: '800', color: C.text },
  summaryStatusLabel: { fontSize: 10, color: C.textMuted, marginTop: 2 },
  listHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SP.xxl, marginBottom: SP.md },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: C.text },
  listCount: { fontSize: 12, color: C.textMuted, marginTop: 3 },
  refreshButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderSubtle },
  filters: { paddingBottom: SP.md },
  filterChip: { minHeight: 36, borderRadius: R.pill, borderWidth: 1, borderColor: C.borderSubtle, backgroundColor: C.surface, paddingHorizontal: SP.md, alignItems: 'center', justifyContent: 'center', marginRight: SP.sm },
  filterChipSelected: { backgroundColor: C.tint, borderColor: C.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  filterTextSelected: { color: C.primary, fontWeight: '800' },
  vehicleCard: { backgroundColor: C.surface, borderRadius: R.lg, padding: SP.md, marginBottom: SP.lg, ...SHADOW },
  vehicleImage: { width: '100%', height: 170, borderRadius: R.md, backgroundColor: C.background },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: C.textMuted, fontSize: 12, marginTop: SP.xs },
  vehicleContent: { paddingHorizontal: SP.xs, paddingTop: SP.md },
  vehicleTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  vehicleTitleWrap: { flex: 1, paddingRight: SP.sm },
  vehicleTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  vehicleSubtitle: { fontSize: 12, color: C.textMuted, marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: R.pill, paddingHorizontal: 10, paddingVertical: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  plateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SP.md },
  plateBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.borderSubtle, backgroundColor: C.background, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7 },
  plateText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: C.text, marginLeft: 7 },
  quickFacts: { flexDirection: 'row', flexWrap: 'wrap', marginTop: SP.md },
  factPill: { flexDirection: 'row', alignItems: 'center', borderRadius: R.pill, backgroundColor: C.tint, paddingHorizontal: 10, paddingVertical: 7, marginRight: 7, marginBottom: 5 },
  factText: { fontSize: 11, color: C.secondary, fontWeight: '700', marginLeft: 5 },
  expandedArea: { paddingHorizontal: SP.xs, paddingTop: SP.md },
  sectionDivider: { height: 1, backgroundColor: C.borderSubtle, marginBottom: SP.lg },
  sectionHeading: { fontSize: 14, fontWeight: '800', color: C.text, marginBottom: SP.md },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', flexDirection: 'row', alignItems: 'center', paddingRight: SP.sm, marginBottom: SP.md },
  infoIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, marginLeft: SP.sm },
  infoLabel: { fontSize: 10, color: C.textMuted },
  infoValue: { fontSize: 12, color: C.text, fontWeight: '700', marginTop: 2 },
  expiryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.background, borderRadius: R.md, padding: SP.md, marginBottom: SP.sm },
  expiryCopy: { flex: 1 },
  expiryLabel: { fontSize: 11, color: C.textMuted },
  expiryValue: { fontSize: 13, color: C.text, fontWeight: '700', marginTop: 3 },
  recordText: { fontSize: 10, color: C.textMuted, marginTop: SP.sm },
  stateCard: { alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderRadius: R.lg, padding: SP.xxl, marginTop: SP.md, ...SHADOW },
  stateIcon: { width: 58, height: 58, borderRadius: 20, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center', marginBottom: SP.md },
  stateTitle: { fontSize: 17, fontWeight: '800', color: C.text, textAlign: 'center' },
  stateText: { fontSize: 13, lineHeight: 20, color: C.textMuted, textAlign: 'center', marginTop: SP.sm },
  retryButton: { minHeight: 44, paddingHorizontal: SP.xl, borderRadius: R.md, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center', marginTop: SP.lg },
  retryText: { color: C.primary, fontSize: 14, fontWeight: '800' },
  addVehicleButton: { minHeight: 54, borderRadius: R.md, backgroundColor: C.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',   marginBottom: 85, ...SHADOW },
  addVehicleText: { color: C.white, fontSize: 15, fontWeight: '800', marginLeft: SP.sm },
});
