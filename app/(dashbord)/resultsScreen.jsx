import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import PlaceInput from '../../components/map/PlaceInput';
import { setMapPickerSelectionHandler } from '../../context/mapNavigation';
import { searchAvailableRides } from '../../api/rideService';

/* =======================================================
   DESIGN TOKENS
======================================================= */
const C = {
  primary: '#5B4BDB',
  secondary: '#312E81',
  accent: '#F0ABFC',
  background: '#F8F7FF',
  text: '#24213B',
  textMuted: 'rgba(36,33,59,0.6)',
  white: '#FFFFFF',
  border: '#E4E1F5',
  tint: '#EEEBFF',
  gradientEnd: '#E9E4FF',
  line: '#CFC9F5',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  success: '#16A34A',
  successSoft: '#E8F7EE',
  star: '#F59E0B',
  amber: '#B45309',
  amberSoft: '#FEF3C7',
  greySoft: '#F1F0F7',
  grey: '#6B7280',
};

const R = { sm: 12, md: 16, lg: 24, xl: 28, pill: 999 };
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const MAX_W = 560;

const DEFAULT_MAP_CENTER = {
  latitude: 6.9271,
  longitude: 79.8612,
};

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

/* =======================================================
   ANIMATION WRAPPER
======================================================= */
function PressScale({
  onPress,
  disabled,
  style,
  children,
  label,
  role = 'button',
  state,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value) {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={state || { disabled: !!disabled }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/* =======================================================
   HELPERS & FORMATTERS
======================================================= */
const VEHICLE_ICONS = {
  Car: 'car',
  Van: 'van-utility',
  SUV: 'car-estate',
  Other: 'dots-horizontal-circle-outline',
};

function getRideVehicleType(ride) {
  const type = ride?.vehicleType || ride?.driver?.vehicleType;
  return VEHICLE_ICONS[type] ? type : 'Other';
}

function getRideHasAC(ride) {
  return !!(ride?.driver?.hasAC ?? ride?.hasAC);
}

function formatPrice(amount) {
  if (amount === undefined || amount === null || Number.isNaN(Number(amount))) {
    return '-';
  }
  return `Rs ${String(Math.round(Number(amount))).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ','
  )}`;
}

function formatDuration(minutes) {
  const total = Number(minutes);
  if (!total || total < 1) return '';
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDistance(meters) {
  const m = Number(meters);
  if (!Number.isFinite(m)) return '';
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function formatTime(date) {
  let h = date.getHours();
  const m = date.getMinutes();
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${pad(h)}:${pad(m)} ${suffix}`;
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function isValidDate(value) {
  return parseLocalDate(value) !== null;
}

function getTodayLocalDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function isPastDate(value) {
  const selected = parseLocalDate(value);
  if (!selected) return false;
  return selected < getTodayLocalDate();
}

function formatDateForBackend(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}`;
}

function hashString(value) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

/* =======================================================
   BACKEND RESPONSE NORMALIZER
======================================================= */
const MOCK_DRIVERS = [
  {
    vehicleType: 'Car',
    driver: {
      name: 'Kasun Perera',
      photoUrl: 'https://i.pravatar.cc/150?img=12',
      verified: true,
      rating: 4.8,
      ridesCount: 42,
      vehicle: 'Toyota Axio',
      hasAC: true,
    },
  },
  {
    vehicleType: 'Van',
    driver: {
      name: 'Nimal Fernando',
      photoUrl: 'https://i.pravatar.cc/150?img=33',
      verified: true,
      rating: 4.6,
      ridesCount: 128,
      vehicle: 'Toyota HiAce',
      hasAC: true,
    },
  },
  {
    vehicleType: 'SUV',
    driver: {
      name: 'Dilani Silva',
      photoUrl: 'https://i.pravatar.cc/150?img=47',
      verified: true,
      rating: 4.9,
      ridesCount: 87,
      vehicle: 'Mitsubishi Montero',
      hasAC: true,
    },
  },
];

function mapBackendRide(row, date) {
  const profile =
    MOCK_DRIVERS[hashString(String(row.route_id || '0')) % MOCK_DRIVERS.length];

  const departure = new Date(row.departure_at || Date.now());
  const durationMin = Math.round(
    Number(row.full_route_duration_seconds || 0) / 60
  );
  const arrival = new Date(departure.getTime() + durationMin * 60000);

  return {
    rawRide: row, // Preserves the raw snake_case backend row
    id: row.route_id,
    date,
    from: row.origin_name || 'Origin',
    to: row.destination_name || 'Destination',
    departureTime: formatTime(departure),
    arrivalTime: formatTime(arrival),
    durationMin,
    pricePerSeat: Number(row.price_per_seat || 0),
    currency: row.currency || 'Rs',
    seatsFree: Number(row.available_seats || 1),

    vehicleType: row.vehicle_type || profile.vehicleType,
    driver: {
      name: row.driver_name || profile.driver.name,
      photoUrl: row.driver_photo_url || profile.driver.photoUrl,
      verified: row.is_driver_verified ?? profile.driver.verified,
      rating: Number(row.driver_rating || profile.driver.rating),
      ridesCount: Number(row.driver_rides_count || profile.driver.ridesCount),
      vehicle: row.vehicle_model || profile.driver.vehicle,
      hasAC: row.has_ac != null ? Boolean(row.has_ac) : profile.driver.hasAC,
    },

    driverId: row.driver_id,
    vehicleId: row.vehicle_id,
    pickupDistanceMeters: Number(row.pickup_distance_meters || 0),
    dropoffDistanceMeters: Number(row.dropoff_distance_meters || 0),
    rideDistanceMeters: Number(row.ride_distance_meters || 0),
    suggestedPickup: row.suggested_pickup,
    suggestedDropoff: row.suggested_dropoff,
    matchedRouteSegment: row.matched_route_segment,
  };
}

/* =======================================================
   CARD & AVATAR SUBCOMPONENTS
======================================================= */
function Avatar({ name, uri, verified }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <View style={cardStyles.avatarWrap}>
      <View style={cardStyles.avatar}>
        {uri && !failed ? (
          <Image
            source={{ uri }}
            style={cardStyles.avatarImage}
            onError={() => setFailed(true)}
          />
        ) : (
          <Text style={cardStyles.avatarText}>{initial}</Text>
        )}
      </View>

      {verified ? (
        <View style={cardStyles.verifiedBadge}>
          <Icon name="check" size={11} color={C.white} />
        </View>
      ) : null}
    </View>
  );
}

const TONES = {
  violet: { bg: C.tint, fg: C.primary },
  green: { bg: C.successSoft, fg: C.success },
  grey: { bg: C.greySoft, fg: C.grey },
  amber: { bg: C.amberSoft, fg: C.amber },
};

function InfoPill({ icon, label, tone = 'violet' }) {
  const colors = TONES[tone] || TONES.violet;

  return (
    <View style={[cardStyles.pill, { backgroundColor: colors.bg }]}>
      <Icon name={icon} size={15} color={colors.fg} />
      <Text
        style={[cardStyles.pillText, { color: colors.fg }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function RouteCard({ ride, onPress }) {
  const driver = ride.driver || {};
  const vehicleType = getRideVehicleType(ride);
  const hasAC = getRideHasAC(ride);
  const duration = formatDuration(ride.durationMin);
  const seats = Number(ride.seatsFree);
  const rating = Number(driver.rating);
  const pickupAway = formatDistance(ride.pickupDistanceMeters);

  const vehicleLabel = driver.vehicle ? `${driver.vehicle}` : vehicleType;

  const accessibilityLabel =
    `${driver.name || 'Driver'}, ${ride.from} to ${ride.to}, ` +
    `departs ${ride.departureTime}, ${formatPrice(ride.pricePerSeat)} per seat`;

  return (
    <PressScale
      onPress={onPress}
      label={accessibilityLabel}
      style={cardStyles.card}
    >
      <View style={cardStyles.topRow}>
        <Avatar
          name={driver.name}
          uri={driver.photoUrl}
          verified={driver.verified}
        />

        <View style={cardStyles.driverInfo}>
          <Text style={cardStyles.driverName} numberOfLines={1}>
            {driver.name || 'Driver'}
          </Text>

          <View style={cardStyles.ratingRow}>
            <Icon name="star" size={15} color={C.star} />
            <Text style={cardStyles.ratingText}>
              {Number.isFinite(rating) && rating > 0
                ? rating.toFixed(1)
                : 'New'}
            </Text>

            {driver.ridesCount ? (
              <Text style={cardStyles.ridesCount}>
                {' '}· {driver.ridesCount} rides
              </Text>
            ) : null}
          </View>
        </View>

        <View style={cardStyles.priceBox}>
          <Text style={cardStyles.price}>
            {formatPrice(ride.pricePerSeat)}
          </Text>
          <Text style={cardStyles.perSeat}>per seat</Text>
        </View>
      </View>

      <View style={cardStyles.timeline}>
        <View style={cardStyles.stop}>
          <Text style={cardStyles.time}>{ride.departureTime}</Text>

          <View style={cardStyles.dotCol}>
            <View style={cardStyles.dotFrom} />
          </View>

          <Text style={cardStyles.place} numberOfLines={1}>
            {ride.from}
          </Text>
        </View>

        <View style={cardStyles.stop}>
          <View style={cardStyles.timeSpacer} />

          <View style={cardStyles.dotCol}>
            <View style={cardStyles.line} />
          </View>

          {duration ? (
            <View style={cardStyles.durationChip}>
              <Icon
                name="clock-outline"
                size={13}
                color={C.textMuted}
              />
              <Text style={cardStyles.durationText}>{duration}</Text>
            </View>
          ) : (
            <View style={cardStyles.durationSpacer} />
          )}
        </View>

        <View style={cardStyles.stop}>
          <Text style={cardStyles.time}>{ride.arrivalTime}</Text>

          <View style={cardStyles.dotCol}>
            <Icon name="map-marker" size={20} color={C.primary} />
          </View>

          <Text style={cardStyles.place} numberOfLines={1}>
            {ride.to}
          </Text>
        </View>
      </View>

      <View style={cardStyles.divider} />

      <View style={cardStyles.pillRow}>
        <InfoPill
          icon={VEHICLE_ICONS[vehicleType]}
          label={vehicleLabel}
        />

        <InfoPill
          icon={hasAC ? 'snowflake' : 'snowflake-off'}
          label={hasAC ? 'AC' : 'No AC'}
          tone={hasAC ? 'green' : 'grey'}
        />

        {Number.isFinite(seats) ? (
          <InfoPill
            icon="seat-passenger"
            label={
              seats <= 0
                ? 'Full'
                : `${seats} seat${seats === 1 ? '' : 's'} left`
            }
            tone={seats <= 2 ? 'amber' : 'violet'}
          />
        ) : null}

        {pickupAway ? (
          <InfoPill
            icon="walk"
            label={`Pickup ${pickupAway} away`}
            tone="grey"
          />
        ) : null}

        {driver.verified ? (
          <InfoPill
            icon="check-decagram"
            label="Verified"
            tone="green"
          />
        ) : null}
      </View>
    </PressScale>
  );
}

const MemoRouteCard = memo(RouteCard);

/* =======================================================
   FILTER CONFIG & PANEL
======================================================= */
const VEHICLE_TYPES = ['Car', 'Van', 'SUV', 'Other'];

const AC_OPTIONS = [
  { value: 'any', label: 'Any', icon: 'tune-variant' },
  { value: 'ac', label: 'AC', icon: 'snowflake' },
  { value: 'noac', label: 'No AC', icon: 'snowflake-off' },
];

const INITIAL_FILTERS = {
  ac: 'any',
  types: [],
};

function FilterPanel({ open, filters, onChange, onClear }) {
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => setMounted(false));
    }
  }, [open, mounted, anim]);

  if (!mounted) return null;

  function toggleType(type) {
    const has = filters.types.includes(type);
    onChange({
      ...filters,
      types: has
        ? filters.types.filter((item) => item !== type)
        : [...filters.types, type],
    });
  }

  const hasActive = filters.ac !== 'any' || filters.types.length > 0;

  return (
    <Animated.View
      style={[
        styles.filterCard,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.filterLabel}>Air conditioning</Text>

      <View style={styles.segWrap} accessibilityRole="radiogroup">
        {AC_OPTIONS.map((option) => {
          const selected = filters.ac === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange({ ...filters, ac: option.value })}
              style={[styles.seg, selected && styles.segOn]}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
            >
              <Icon
                name={option.icon}
                size={16}
                color={selected ? C.white : C.secondary}
              />
              <Text style={[styles.segText, selected && styles.segTextOn]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.filterLabel, styles.filterLabelSpaced]}>
        Vehicle type
      </Text>

      <View style={styles.chipRow}>
        {VEHICLE_TYPES.map((type) => {
          const selected = filters.types.includes(type);
          return (
            <Pressable
              key={type}
              onPress={() => toggleType(type)}
              style={[styles.chip, selected && styles.chipOn]}
              accessibilityRole="button"
              accessibilityLabel={`${type} vehicles`}
              accessibilityState={{ selected }}
            >
              <Icon
                name={VEHICLE_ICONS[type]}
                size={18}
                color={selected ? C.primary : C.textMuted}
              />
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>
                {type}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {hasActive ? (
        <Pressable
          onPress={onClear}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel="Clear all filters"
        >
          <Icon name="close-circle-outline" size={18} color={C.primary} />
          <Text style={styles.clearText}>Clear all filters</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

/* =======================================================
   RESULTS SCREEN MAIN COMPONENT
======================================================= */
export default function ResultsScreen({ route }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = route?.params ?? {};

  // Form input states
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fromCoords, setFromCoords] = useState(null);
  const [toCoords, setToCoords] = useState(null);
  const [date, setDate] = useState(String(params.date ?? tomorrowISO()));
  const [passengers, setPassengers] = useState(
    Math.max(1, Number(params.passengers) || 1)
  );

  // Calendar
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Search Results & UI states
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchOpen, setSearchOpen] = useState(true);
  const [searchError, setSearchError] = useState('');
  const [apiError, setApiError] = useState('');

  // Filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const minimumDate = useMemo(() => getTodayLocalDate(), []);

  const selectedCalendarDate = useMemo(() => {
    const parsed = parseLocalDate(date);
    if (!parsed || parsed < minimumDate) return minimumDate;
    return parsed;
  }, [date, minimumDate]);

  /* -------------------------------------------------------
     MAP PICKER HANDLERS
  ------------------------------------------------------- */
  function openMapPicker(type) {
    const isOrigin = type === 'origin';
    const setCoords = isOrigin ? setFromCoords : setToCoords;
    const setName = isOrigin ? setFrom : setTo;

    setMapPickerSelectionHandler((location) => {
      setCoords({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      setName(
        location.placeName ||
          `Selected (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
      );
    });

    const initial =
      (isOrigin ? fromCoords : toCoords) || DEFAULT_MAP_CENTER;

    router.push({
      pathname: '/map-picker',
      params: {
        latitude: String(initial.latitude),
        longitude: String(initial.longitude),
        placeName: isOrigin ? from : to,
      },
    });
  }

  function swapLocations() {
    setFrom(to);
    setTo(from);
    setFromCoords(toCoords);
    setToCoords(fromCoords);
  }

  function handleDateChange(event, selectedDate) {
    setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      const formattedDate = formatDateForBackend(selectedDate);
      setDate(formattedDate);
      setSearchError('');
      setApiError('');
    }
  }

  /* -------------------------------------------------------
     CORE SEARCH EXECUTION
  ------------------------------------------------------- */
  const handleSearch = useCallback(async () => {
    const cleanDate = date.trim();

    if (!fromCoords || !toCoords) {
      setSearchError(
        'Choose a suggestion (or use the pin button) for both origin and destination.'
      );
      return;
    }

    if (
      fromCoords.latitude === toCoords.latitude &&
      fromCoords.longitude === toCoords.longitude
    ) {
      setSearchError('Origin and destination must be different.');
      return;
    }

    if (!isValidDate(cleanDate)) {
      setSearchError('Please select a valid travel date.');
      return;
    }

    if (isPastDate(cleanDate)) {
      setSearchError(
        'Travel date cannot be in the past. Please select today or a future date.'
      );
      return;
    }

    setSearchError('');
    setApiError('');
    setHasSearched(true);
    setSearchOpen(false);
    setLoading(true);
    setRides([]);

    try {
      // Calls centralized service (Axios interceptor injects Bearer token)
      const rows = await searchAvailableRides({
        pickup: fromCoords,
        dropoff: toCoords,
        departureDate: cleanDate,
        seats: passengers,
        maxDistanceMeters: 5000,
      });

      setRides(rows.map((row) => mapBackendRide(row, cleanDate)));
    } catch (err) {
      console.log('Ride search error:', err?.message);
      setApiError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [fromCoords, toCoords, date, passengers]);

  /* -------------------------------------------------------
     FILTER CALCULATION
  ------------------------------------------------------- */
  const visibleRides = useMemo(() => {
    return (rides || []).filter((ride) => {
      const hasAC = getRideHasAC(ride);
      if (filters.ac === 'ac' && !hasAC) return false;
      if (filters.ac === 'noac' && hasAC) return false;

      if (
        filters.types.length > 0 &&
        !filters.types.includes(getRideVehicleType(ride))
      ) {
        return false;
      }

      return true;
    });
  }, [rides, filters]);

  const activeFilterCount =
    (filters.ac !== 'any' ? 1 : 0) + filters.types.length;

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const renderItem = useCallback(
    ({ item }) => (
      <MemoRouteCard
        ride={item}
        onPress={() =>
          router.push({
            pathname: '/ride-details',
            params: {
              ride: JSON.stringify({
                ...item.rawRide, // Passes the raw snake_case data down to details
                searchPickup: fromCoords,
                searchDropoff: toCoords,
              }),
              passengers: String(passengers),
            },
          })
        }
      />
    ),
    [router, passengers, fromCoords, toCoords]
  );

  /* -------------------------------------------------------
     HEADER WITH CONTROLS & INPUTS
  ------------------------------------------------------- */
  const header = (
    <SafeAreaView edges={['top']} style={{ backgroundColor: C.background }}>
      <View style={styles.headerWrap}>
        <PressScale
          onPress={() => setSearchOpen((open) => !open)}
          label={searchOpen ? 'Hide ride search' : 'Search for rides'}
          state={{ expanded: searchOpen }}
          style={styles.searchToggleButton}
        >
          <Icon
            name={searchOpen ? 'close' : 'magnify'}
            size={20}
            color={C.white}
          />
          <Text style={styles.searchToggleText}>
            {searchOpen ? 'Close search' : 'Search rides'}
          </Text>
          <Icon
            name={searchOpen ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={C.white}
          />
        </PressScale>

        {searchOpen && (
          <View style={styles.searchCard}>
            <View style={styles.searchHeadingRow}>
              <View style={styles.searchHeadingIcon}>
                <Icon
                  name="map-search-outline"
                  size={21}
                  color={C.primary}
                />
              </View>
              <View style={styles.searchHeadingText}>
                <Text style={styles.searchHeading}>Find your ride</Text>
                <Text style={styles.searchSubheading}>
                  Search places or pick them on the map
                </Text>
              </View>
            </View>

            {/* ORIGIN & DESTINATION INPUTS */}
            <View style={styles.inputsWrap}>
              <PlaceInput
                label="Origin"
                color={C.success}
                value={from}
                hasCoords={!!fromCoords}
                onChangeText={(t) => {
                  setFrom(t);
                  setFromCoords(null);
                }}
                onSelect={(p) => {
                  setFrom(p.name);
                  setFromCoords({
                    latitude: p.latitude,
                    longitude: p.longitude,
                  });
                }}
                onPickMap={() => openMapPicker('origin')}
              />

              <Pressable
                style={styles.swapBtn}
                onPress={swapLocations}
                accessibilityRole="button"
                accessibilityLabel="Swap origin and destination"
              >
                <Icon name="swap-vertical" size={18} color={C.white} />
              </Pressable>

              <PlaceInput
                label="Destination"
                color={C.danger}
                value={to}
                hasCoords={!!toCoords}
                onChangeText={(t) => {
                  setTo(t);
                  setToCoords(null);
                }}
                onSelect={(p) => {
                  setTo(p.name);
                  setToCoords({
                    latitude: p.latitude,
                    longitude: p.longitude,
                  });
                }}
                onPickMap={() => openMapPicker('destination')}
              />
            </View>

            {/* TRAVEL DATE CALENDAR */}
            <View style={[styles.inputGroup, styles.dateGroup]}>
              <Text style={styles.inputLabel}>TRAVEL DATE</Text>
              <Pressable
                style={styles.inputShell}
                onPress={() => setShowDatePicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Select travel date"
              >
                <Icon
                  name="calendar-month-outline"
                  size={20}
                  color={C.primary}
                />
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateValue}>{date}</Text>
                  <Text style={styles.dateHint}>
                    Tap to choose your travel date
                  </Text>
                </View>
                <Icon name="chevron-down" size={20} color={C.grey} />
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedCalendarDate}
                  mode="date"
                  display="default"
                  minimumDate={minimumDate}
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* PASSENGERS STEPPER */}
            <View style={styles.passengerRow}>
              <View style={styles.passengerInfo}>
                <View style={styles.passengerIcon}>
                  <Icon
                    name="account-multiple-outline"
                    size={20}
                    color={C.primary}
                  />
                </View>
                <View>
                  <Text style={styles.passengerTitle}>Passengers</Text>
                  <Text style={styles.passengerHint}>
                    How many seats do you need?
                  </Text>
                </View>
              </View>

              <View style={styles.stepper}>
                <Pressable
                  onPress={() =>
                    setPassengers((count) => Math.max(1, count - 1))
                  }
                  style={styles.stepperButton}
                  accessibilityRole="button"
                  accessibilityLabel="Remove one passenger"
                  disabled={passengers <= 1}
                >
                  <Icon
                    name="minus"
                    size={18}
                    color={passengers <= 1 ? C.grey : C.primary}
                  />
                </Pressable>

                <Text style={styles.passengerCount}>{passengers}</Text>

                <Pressable
                  onPress={() =>
                    setPassengers((count) => Math.min(12, count + 1))
                  }
                  style={styles.stepperButton}
                  accessibilityRole="button"
                  accessibilityLabel="Add one passenger"
                  disabled={passengers >= 12}
                >
                  <Icon
                    name="plus"
                    size={18}
                    color={passengers >= 12 ? C.grey : C.primary}
                  />
                </Pressable>
              </View>
            </View>

            {/* VALIDATION ERROR */}
            {searchError ? (
              <View style={styles.searchError}>
                <Icon
                  name="alert-circle-outline"
                  size={18}
                  color={C.danger}
                />
                <Text style={styles.searchErrorText}>{searchError}</Text>
              </View>
            ) : null}

            {/* SEARCH BUTTON */}
            <PressScale
              onPress={handleSearch}
              disabled={loading}
              label="Search available rides"
              style={[
                styles.searchButton,
                loading && styles.searchButtonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <>
                  <Icon name="magnify" size={20} color={C.white} />
                  <Text style={styles.searchButtonText}>Search rides</Text>
                </>
              )}
            </PressScale>
          </View>
        )}

        {/* RESULTS HEADER & FILTER BUTTON */}
        {hasSearched && !loading && !apiError ? (
          <>
            <View style={styles.titleRow}>
              <View style={styles.titleText}>
                <Text style={styles.resultsTitle} accessibilityRole="header">
                  Available rides
                </Text>
                <Text style={styles.resultsCount}>
                  {activeFilterCount > 0
                    ? `${visibleRides.length} of ${rides.length} rides`
                    : `${rides.length} ${
                        rides.length === 1 ? 'ride' : 'rides'
                      }`}
                </Text>
              </View>
              <Pressable 
                onPress={() => setFiltersOpen(!filtersOpen)} 
                style={styles.filterToggleBtn}
              >
                <Icon name="filter-variant" size={24} color={filtersOpen ? C.primary : C.textMuted} />
              </Pressable>
            </View>
            <FilterPanel
              open={filtersOpen}
              filters={filters}
              onChange={setFilters}
              onClear={clearFilters}
            />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleRides}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          hasSearched && !loading ? (
            <View style={styles.emptyWrap}>
              <Icon name="car-off" size={48} color={C.grey} />
              <Text style={styles.emptyTitle}>No rides found</Text>
              <Text style={styles.emptyText}>Try changing your date or adjusting the filters.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

/* =======================================================
   STYLESHEETS
======================================================= */
const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    padding: SP.lg,
    marginBottom: SP.md,
    ...SHADOW,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SP.lg,
  },
  avatarWrap: {
    position: 'relative',
    marginRight: SP.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.tint,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: C.primary,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: C.success,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.white,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginLeft: 4,
  },
  ridesCount: {
    fontSize: 13,
    color: C.textMuted,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: C.primary,
  },
  perSeat: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  timeline: {
    marginLeft: 8,
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    width: 65,
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  dotCol: {
    width: 30,
    alignItems: 'center',
  },
  dotFrom: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.textMuted,
  },
  place: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },
  timeSpacer: {
    width: 65,
  },
  line: {
    width: 2,
    height: 30,
    backgroundColor: C.line,
    marginVertical: 4,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: R.pill,
  },
  durationText: {
    fontSize: 12,
    color: C.textMuted,
    marginLeft: 4,
    fontWeight: '500',
  },
  durationSpacer: {
    height: 30,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: SP.md,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: R.pill,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  headerWrap: {
    padding: SP.lg,
  },
  searchToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    paddingVertical: SP.sm,
    paddingHorizontal: SP.md,
    borderRadius: R.pill,
    alignSelf: 'center',
    marginBottom: SP.md,
    ...SHADOW,
  },
  searchToggleText: {
    color: C.white,
    fontWeight: '700',
    marginHorizontal: SP.sm,
  },
  searchCard: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    padding: SP.lg,
    ...SHADOW,
    marginBottom: SP.lg,
  },
  searchHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SP.lg,
  },
  searchHeadingIcon: {
    backgroundColor: C.tint,
    padding: SP.sm,
    borderRadius: R.pill,
    marginRight: SP.md,
  },
  searchHeadingText: {
    flex: 1,
  },
  searchHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  searchSubheading: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 2,
  },
  inputsWrap: {
    position: 'relative',
    marginBottom: SP.lg,
  },
  swapBtn: {
    position: 'absolute',
    right: 20,
    top: '50%',
    marginTop: -16,
    width: 32,
    height: 32,
    backgroundColor: C.secondary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  inputGroup: {
    marginBottom: SP.md,
  },
  dateGroup: {
    marginBottom: SP.lg,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    marginBottom: SP.sm,
    letterSpacing: 1,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    padding: SP.md,
  },
  dateTextContainer: {
    flex: 1,
    marginLeft: SP.md,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  dateHint: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SP.xl,
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passengerIcon: {
    backgroundColor: C.tint,
    padding: SP.sm,
    borderRadius: R.pill,
    marginRight: SP.md,
  },
  passengerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  passengerHint: {
    fontSize: 13,
    color: C.textMuted,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerCount: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    width: 40,
    textAlign: 'center',
  },
  searchButton: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SP.lg,
    borderRadius: R.md,
  },
  searchButtonDisabled: {
    opacity: 0.7,
  },
  searchButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: SP.sm,
  },
  searchError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.dangerSoft,
    padding: SP.md,
    borderRadius: R.md,
    marginBottom: SP.lg,
  },
  searchErrorText: {
    color: C.danger,
    fontSize: 14,
    marginLeft: SP.sm,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SP.sm,
  },
  titleText: {
    flex: 1,
  },
  resultsTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
  },
  resultsCount: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: 4,
  },
  filterToggleBtn: {
    padding: SP.sm,
  },
  filterCard: {
    backgroundColor: C.white,
    borderRadius: R.md,
    padding: SP.md,
    marginBottom: SP.md,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: SP.sm,
  },
  filterLabelSpaced: {
    marginTop: SP.md,
  },
  segWrap: {
    flexDirection: 'row',
    backgroundColor: C.background,
    borderRadius: R.md,
    padding: 4,
  },
  seg: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: R.sm,
  },
  segOn: {
    backgroundColor: C.primary,
  },
  segText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.secondary,
    marginLeft: 4,
  },
  segTextOn: {
    color: C.white,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SP.md,
    paddingVertical: 8,
    borderRadius: R.pill,
    backgroundColor: C.background,
    borderWidth: 1,
    borderColor: C.border,
  },
  chipOn: {
    backgroundColor: C.tint,
    borderColor: C.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textMuted,
    marginLeft: 6,
  },
  chipTextOn: {
    color: C.primary,
  },
  clearButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SP.lg,
    paddingVertical: SP.sm,
  },
  clearText: {
    color: C.primary,
    fontWeight: '600',
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: SP.lg,
    paddingBottom: SP.xxl,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SP.xxxl * 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    marginTop: SP.md,
  },
  emptyText: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: SP.sm,
    textAlign: 'center',
  },
});