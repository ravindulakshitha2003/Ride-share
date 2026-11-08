import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Animated,
  Easing,
  FlatList,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { searchRides } from '../../api/rides';
import { friendlyDate } from '../../utils/date';

import { SafeAreaView } from "react-native-safe-area-context";

/* =======================================================
   LOCAL DESIGN TOKENS (formerly theme/appTokens.js)
======================================================= */

// Shared design tokens (same look as the Add Vehicle and Profile pages).
// Import these in every new page instead of hard-coding values.

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

const SP = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

const MAX_W = 560;

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
   PRESS ANIMATION (formerly components/PressScale.jsx)
======================================================= */

// Wrap any button or card. It shrinks slightly while pressed, then springs back.
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
   RIDE CARD (formerly components/RouteCard.jsx)
======================================================= */


/* -------------------------------------------------------------------------- */
/*  Helpers (also used by the results screen filters)                         */
/* -------------------------------------------------------------------------- */

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

  if (!total || total < 1) {
    return '';
  }

  const h = Math.floor(total / 60);
  const m = total % 60;

  if (h === 0) {
    return `${m}m`;
  }

  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/* -------------------------------------------------------------------------- */
/*  Small pieces                                                              */
/* -------------------------------------------------------------------------- */

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
  const colors = TONES[tone];

  return (
    <View style={[cardStyles.pill, { backgroundColor: colors.bg }]}>
      <Icon name={icon} size={15} color={colors.fg} />
      <Text style={[cardStyles.pillText, { color: colors.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Route card                                                                */
/* -------------------------------------------------------------------------- */

function RouteCard({ ride, onPress }) {
  const driver = ride.driver || {};
  const vehicleType = getRideVehicleType(ride);
  const hasAC = getRideHasAC(ride);
  const duration = formatDuration(ride.durationMin);
  const seats = Number(ride.seatsFree);
  const rating = Number(driver.rating);

  const vehicleLabel = driver.vehicle
    ? `${driver.vehicle}`
    : vehicleType;

  const accessibilityLabel =
    `${driver.name || 'Driver'}, ${ride.from} to ${ride.to}, ` +
    `departs ${ride.departureTime}, ${formatPrice(ride.pricePerSeat)} per seat`;

  return (
    <PressScale
      onPress={onPress}
      label={accessibilityLabel}
      style={cardStyles.card}
    >
      {/* Driver + price */}
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
              {Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : 'New'}
            </Text>
            {driver.ridesCount ? (
              <Text style={cardStyles.ridesCount}>
                {' '}
                · {driver.ridesCount} rides
              </Text>
            ) : null}
          </View>
        </View>

        <View style={cardStyles.priceBox}>
          <Text style={cardStyles.price}>{formatPrice(ride.pricePerSeat)}</Text>
          <Text style={cardStyles.perSeat}>per seat</Text>
        </View>
      </View>

      {/* Route timeline */}
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
              <Icon name="clock-outline" size={13} color={C.textMuted} />
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

      {/* Feature pills */}
      <View style={cardStyles.pillRow}>
        <InfoPill icon={VEHICLE_ICONS[vehicleType]} label={vehicleLabel} />

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

        {driver.verified ? (
          <InfoPill icon="check-decagram" label="Verified" tone="green" />
        ) : null}
      </View>
    </PressScale>
  );
}

const MemoRouteCard = memo(RouteCard);

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    padding: SP.xl,
    marginBottom: SP.lg,
    ...SHADOW,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 56,
    height: 56,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: C.tint,
  },
  avatarImage: {
    width: 56,
    height: 56,
  },
  avatarText: {
    color: C.white,
    fontSize: 22,
    fontWeight: '800',
  },
  verifiedBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.success,
    borderWidth: 2,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfo: {
    flex: 1,
    marginLeft: SP.md,
    paddingRight: SP.sm,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '800',
    color: C.text,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginLeft: 3,
  },
  ridesCount: {
    fontSize: 13,
    color: C.textMuted,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: C.primary,
  },
  perSeat: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 1,
  },

  timeline: {
    marginTop: SP.xl,
  },
  stop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    width: 76,
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  timeSpacer: {
    width: 76,
  },
  dotCol: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFrom: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: C.primary,
    backgroundColor: C.white,
  },
  line: {
    width: 2,
    height: 34,
    backgroundColor: C.line,
  },
  place: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    marginLeft: SP.sm,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SP.sm,
    paddingHorizontal: SP.sm + 2,
    paddingVertical: 3,
    borderRadius: R.pill,
    backgroundColor: C.greySoft,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
    marginLeft: 4,
  },
  durationSpacer: {
    height: 34,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginTop: SP.lg,
    marginBottom: SP.md,
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SP.md,
    height: 32,
    borderRadius: R.pill,
    marginRight: SP.sm,
    marginBottom: SP.sm,
    maxWidth: '100%',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 5,
    flexShrink: 1,
  },
});


/* -------------------------------------------------------
   Defaults
------------------------------------------------------- */

const VEHICLE_TYPES = ['Car', 'Van', 'SUV', 'Other'];

const AC_OPTIONS = [
  { value: 'any', label: 'Any', icon: 'tune-variant' },
  { value: 'ac', label: 'AC', icon: 'snowflake' },
  { value: 'noac', label: 'No AC', icon: 'snowflake-off' },
];

const INITIAL_FILTERS = { ac: 'any', types: [] };

function pad(n) {
  return String(n).padStart(2, '0');
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* -------------------------------------------------------
   Mock data
------------------------------------------------------- */

// TODO: Remove MOCK_RIDES when the backend search API is ready.
// Each ride keeps the RideCard structure and adds:
//   vehicleType        Car | Van | SUV | Other
//   driver.photoUrl    driver profile picture

const MOCK_RIDES = [
  {
    id: 'mock_ride_001',
    departureTime: '06:30 AM',
    arrivalTime: '12:00 PM',
    durationMin: 330,
    pricePerSeat: 1800,
    seatsFree: 3,
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
    id: 'mock_ride_002',
    departureTime: '07:15 AM',
    arrivalTime: '01:00 PM',
    durationMin: 345,
    pricePerSeat: 1200,
    seatsFree: 8,
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
    id: 'mock_ride_003',
    departureTime: '08:00 AM',
    arrivalTime: '02:00 PM',
    durationMin: 360,
    pricePerSeat: 1500,
    seatsFree: 2,
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
  {
    id: 'mock_ride_004',
    departureTime: '09:30 AM',
    arrivalTime: '03:45 PM',
    durationMin: 375,
    pricePerSeat: 900,
    seatsFree: 1,
    vehicleType: 'Car',
    driver: {
      name: 'Sampath Jayasinghe',
      photoUrl: 'https://i.pravatar.cc/150?img=15',
      verified: false,
      rating: 4.2,
      ridesCount: 14,
      vehicle: 'Suzuki Alto',
      hasAC: false,
    },
  },
  {
    id: 'mock_ride_005',
    departureTime: '11:00 AM',
    arrivalTime: '05:00 PM',
    durationMin: 360,
    pricePerSeat: 1000,
    seatsFree: 6,
    vehicleType: 'Van',
    driver: {
      name: 'Ruwan Bandara',
      photoUrl: 'https://i.pravatar.cc/150?img=60',
      verified: true,
      rating: 4.4,
      ridesCount: 63,
      vehicle: 'Nissan Caravan',
      hasAC: false,
    },
  },
  {
    id: 'mock_ride_006',
    departureTime: '01:30 PM',
    arrivalTime: '07:30 PM',
    durationMin: 360,
    pricePerSeat: 2100,
    seatsFree: 3,
    vehicleType: 'SUV',
    driver: {
      name: 'Thilini Weerasinghe',
      photoUrl: 'https://i.pravatar.cc/150?img=45',
      verified: true,
      rating: 4.7,
      ridesCount: 51,
      vehicle: 'Toyota Land Cruiser',
      hasAC: true,
    },
  },
  {
    id: 'mock_ride_007',
    departureTime: '04:00 PM',
    arrivalTime: '09:45 PM',
    durationMin: 345,
    pricePerSeat: 1600,
    seatsFree: 2,
    vehicleType: 'Car',
    driver: {
      name: 'Chamara Gunawardena',
      photoUrl: 'https://i.pravatar.cc/150?img=68',
      verified: false,
      rating: 4.5,
      ridesCount: 22,
      vehicle: 'Honda Fit',
      hasAC: true,
    },
  },
  {
    id: 'mock_ride_008',
    departureTime: '06:00 PM',
    arrivalTime: '11:30 PM',
    durationMin: 330,
    pricePerSeat: 800,
    seatsFree: 4,
    vehicleType: 'Other',
    driver: {
      name: 'Pradeep Kumara',
      photoUrl: 'https://i.pravatar.cc/150?img=52',
      verified: true,
      rating: 4.1,
      ridesCount: 9,
      vehicle: 'Mini bus',
      hasAC: false,
    },
  },
];

// Create mock rides using the current search parameters.
function getMockRides(from, to, date) {
  return MOCK_RIDES.map((ride) => ({
    ...ride,
    from,
    to,
    date,
    driver: { ...ride.driver },
  }));
}

/* -------------------------------------------------------
   Page background
------------------------------------------------------- */

function GradientScreen({ children }) {
  return (
    <LinearGradient
      colors={[C.background, C.gradientEnd]}
      style={styles.flex}
    >
      <View pointerEvents="none" style={styles.glowA} />
      <View pointerEvents="none" style={styles.glowB} />
      {children}
    </LinearGradient>
  );
}

/* -------------------------------------------------------
   Filter panel (hidden until the Filters button is pressed)
------------------------------------------------------- */

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!mounted) {
    return null;
  }

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

/* -------------------------------------------------------
   Results screen
------------------------------------------------------- */

export default function ResultsScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const params = route?.params ?? {};

  // Route params, when supplied, are editable initial values—not fixed routes.
  const [from, setFrom] = useState(String(params.from ?? 'Kandy'));
  const [to, setTo] = useState(String(params.to ?? 'Colombo'));
  const [date, setDate] = useState(String(params.date ?? tomorrowISO()));
  const [departureTime, setDepartureTime] = useState(
    String(params.departureTime ?? params.time ?? '06:00')
  );
  const [passengers, setPassengers] = useState(
    Math.max(1, Number(params.passengers) || 1)
  );

  // Show sample ride cards immediately; users can open the search form when needed.
  const [rides, setRides] = useState(() =>
    getMockRides(
      String(params.from ?? 'Kandy'),
      String(params.to ?? 'Colombo'),
      String(params.date ?? tomorrowISO())
    )
  );
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(true);
  const [usingMockData, setUsingMockData] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const isValidDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  };

  const isValidTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

  const load = useCallback(async () => {
    const cleanFrom = from.trim();
    const cleanTo = to.trim();
    const cleanDate = date.trim();
    const cleanTime = departureTime.trim();

    if (!cleanFrom || !cleanTo || !cleanDate || !cleanTime) {
      setSearchError(
        'Please enter your origin, destination, travel date and departure time.'
      );
      return;
    }

    if (cleanFrom.toLowerCase() === cleanTo.toLowerCase()) {
      setSearchError('Origin and destination must be different.');
      return;
    }

    if (!isValidDate(cleanDate)) {
      setSearchError('Enter a valid date in YYYY-MM-DD format.');
      return;
    }

    if (!isValidTime(cleanTime)) {
      setSearchError(
        'Enter a valid departure time in 24-hour format, for example 08:30.'
      );
      return;
    }

    setSearchError('');
    setHasSearched(true);
    setSearchOpen(false);
    setLoading(true);
    setUsingMockData(false);
    setRides([]);

    try {
      const result = await searchRides({
        from: cleanFrom,
        to: cleanTo,
        date: cleanDate,
        departureTime: cleanTime,
        passengers,
      });

      const rideList = Array.isArray(result)
        ? result
        : Array.isArray(result?.rides)
          ? result.rides
          : null;

      if (!rideList) {
        throw new Error('Invalid ride list received from server.');
      }

      setRides(rideList);
    } catch (err) {
      console.log(
        'Ride search API unavailable. Showing mock rides:',
        err?.message
      );

      const [requestedHours, requestedMinutes] = cleanTime.split(':').map(Number);
      const requestedMinutesTotal = requestedHours * 60 + requestedMinutes;
      const mockRides = getMockRides(cleanFrom, cleanTo, cleanDate);

      setRides(
        mockRides.filter((ride) => {
          const match = String(ride.departureTime || '').match(
            /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
          );
          if (!match) return true;

          let hours = Number(match[1]) % 12;
          if (match[3].toUpperCase() === 'PM') hours += 12;
          return hours * 60 + Number(match[2]) >= requestedMinutesTotal;
        })
      );
      setUsingMockData(true);
    } finally {
      setLoading(false);
    }
  }, [from, to, date, departureTime, passengers]);

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

  const clearFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

  const renderItem = useCallback(
    ({ item }) => (
      <MemoRouteCard
        ride={item}
        onPress={() => {
          navigation?.navigate('RideDetails', {
            ride: item,
            passengers,
          });
        }}
      />
    ),
    [navigation, passengers]
  );

  const header = (

    <SafeAreaView>
    <View>
      <PressScale
        onPress={() => setSearchOpen((open) => !open)}
        label={searchOpen ? 'Hide ride search' : 'Search for rides'}
        state={{ expanded: searchOpen }}
        style={styles.searchToggleButton}
      >
        <Icon name={searchOpen ? 'close' : 'magnify'} size={20} color={C.white} />
        <Text style={styles.searchToggleText}>
          {searchOpen ? 'Close search' : 'Search rides'}
        </Text>
        <Icon name={searchOpen ? 'chevron-up' : 'chevron-down'} size={18} color={C.white} />
      </PressScale>

      {searchOpen ? <View style={styles.searchCard}>
        <View style={styles.searchHeadingRow}>
          <View style={styles.searchHeadingIcon}>
            <Icon name="map-search-outline" size={21} color={C.primary} />
          </View>
          <View style={styles.searchHeadingText}>
            <Text style={styles.searchHeading}>Find your ride</Text>
            <Text style={styles.searchSubheading}>
              Enter your trip details to see available rides
            </Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>ORIGIN</Text>
          <View style={styles.inputShell}>
            <Icon name="map-marker-radius-outline" size={20} color={C.primary} />
            <TextInput
              value={from}
              onChangeText={setFrom}
              placeholder="Where are you travelling from?"
              placeholderTextColor={C.grey}
              style={styles.searchInput}
              returnKeyType="next"
              autoCapitalize="words"
              accessibilityLabel="Origin"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>DESTINATION</Text>
          <View style={styles.inputShell}>
            <Icon name="map-marker-outline" size={20} color={C.primary} />
            <TextInput
              value={to}
              onChangeText={setTo}
              placeholder="Where do you want to go?"
              placeholderTextColor={C.grey}
              style={styles.searchInput}
              returnKeyType="next"
              autoCapitalize="words"
              accessibilityLabel="Destination"
            />
          </View>
        </View>

        <View style={styles.tripOptionsRow}>
          <View style={[styles.inputGroup, styles.tripOption]}>
            <Text style={styles.inputLabel}>TRAVEL DATE</Text>
            <View style={styles.inputShell}>
              <Icon name="calendar-month-outline" size={19} color={C.primary} />
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.grey}
                style={styles.searchInput}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
                accessibilityLabel="Travel date"
              />
            </View>
          </View>

          <View style={[styles.inputGroup, styles.tripOption, styles.tripOptionSecond]}>
            <Text style={styles.inputLabel}>DEPARTURE TIME</Text>
            <View style={styles.inputShell}>
              <Icon name="clock-outline" size={19} color={C.primary} />
              <TextInput
                value={departureTime}
                onChangeText={setDepartureTime}
                placeholder="HH:MM"
                placeholderTextColor={C.grey}
                style={styles.searchInput}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                accessibilityLabel="Departure time"
              />
            </View>
          </View>
        </View>

        <View style={styles.passengerRow}>
          <View style={styles.passengerInfo}>
            <View style={styles.passengerIcon}>
              <Icon name="account-multiple-outline" size={20} color={C.primary} />
            </View>
            <View>
              <Text style={styles.passengerTitle}>Passengers</Text>
              <Text style={styles.passengerHint}>How many seats do you need?</Text>
            </View>
          </View>

          <View style={styles.stepper}>
            <Pressable
              onPress={() => setPassengers((count) => Math.max(1, count - 1))}
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
              onPress={() => setPassengers((count) => Math.min(12, count + 1))}
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

        {searchError ? (
          <View style={styles.searchError}>
            <Icon name="alert-circle-outline" size={18} color={C.danger} />
            <Text style={styles.searchErrorText}>{searchError}</Text>
          </View>
        ) : null}

        <PressScale
          onPress={load}
          disabled={loading}
          label="Search available rides"
          style={[styles.searchButton, loading && styles.searchButtonDisabled]}
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
      </View> : null}

      {usingMockData ? (
        <View style={styles.mockNotice}>
          <Icon name="information-outline" size={20} color={C.primary} />
          <Text style={styles.mockNoticeText}>
            Showing sample rides because the live search is unavailable.
          </Text>
        </View>
      ) : null}

      {hasSearched ? (
        <>
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <Text style={styles.resultsTitle} accessibilityRole="header">
                Available rides
              </Text>
              <Text style={styles.resultsCount} accessibilityLiveRegion="polite">
                {activeFilterCount > 0
                  ? `${visibleRides.length} of ${rides.length} rides`
                  : `${rides.length} ${rides.length === 1 ? 'ride' : 'rides'} found`}
              </Text>
            </View>

            <PressScale
              onPress={() => setFiltersOpen((previous) => !previous)}
              label={
                activeFilterCount > 0
                  ? `Filters, ${activeFilterCount} active`
                  : 'Filters'
              }
              state={{ expanded: filtersOpen }}
              style={[
                styles.filterButton,
                (filtersOpen || activeFilterCount > 0) && styles.filterButtonOn,
              ]}
            >
              <Icon name="tune-variant" size={18} color={C.primary} />
              <Text style={styles.filterButtonText}>Filters</Text>
              {activeFilterCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </PressScale>
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

  const filteredOut = rides.length > 0 && visibleRides.length === 0;

  return (
    <GradientScreen>
      <FlatList
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
        data={hasSearched ? visibleRides : []}
        keyExtractor={(item, index) =>
          String(item.id ?? item._id ?? `ride-${index}`)
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Icon
                name={
                  !hasSearched
                    ? 'magnify'
                    : filteredOut
                      ? 'filter-off-outline'
                      : 'car-off'
                }
                size={44}
                color={C.primary}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {!hasSearched
                ? 'Ready to find a ride?'
                : filteredOut
                  ? 'No rides match your filters'
                  : 'No rides found'}
            </Text>

            <Text style={styles.emptyText}>
              {!hasSearched
                ? 'Enter your origin, destination, travel date, departure time and passenger count above.'
                : filteredOut
                  ? 'Try turning off a filter to see more rides.'
                  : 'There are currently no rides for these search details. Try another time or destination.'}
            </Text>

            {hasSearched ? (
              <PressScale
                onPress={filteredOut ? clearFilters : load}
                label={filteredOut ? 'Clear filters' : 'Search again'}
                style={styles.button}
              >
                <Text style={styles.buttonText}>
                  {filteredOut ? 'Clear filters' : 'Search again'}
                </Text>
              </PressScale>
            ) : null}
          </View>
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </GradientScreen>
  );
}

/* -------------------------------------------------------
   Styles
------------------------------------------------------- */

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  glowA: {
    position: 'absolute',
    top: -80,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: C.accent,
    opacity: 0.28,
  },

  glowB: {
    position: 'absolute',
    bottom: 120,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.primary,
    opacity: 0.1,
  },

  content: {
    width: '100%',
    maxWidth: MAX_W,
    alignSelf: 'center',
    paddingHorizontal: SP.xl,
    paddingTop: SP.lg,
    flexGrow: 1,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SP.xxl,
  },

  loadingText: {
    fontSize: 15,
    color: C.textMuted,
    marginTop: SP.md,
  },

  searchToggleButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderRadius: R.md,
    paddingHorizontal: SP.lg,
    marginBottom: SP.lg,
    ...SHADOW,
  },
  searchToggleText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
    marginHorizontal: SP.sm,
    flex: 1,
    textAlign: 'center',
  },

  /* editable trip search form */
  searchCard: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    padding: SP.xl,
    marginBottom: SP.xl,
    ...SHADOW,
  },

  searchHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SP.xl,
  },

  searchHeadingIcon: {
    width: 44,
    height: 44,
    borderRadius: R.md,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SP.md,
  },

  searchHeadingText: {
    flex: 1,
  },

  searchHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },

  searchSubheading: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 2,
  },

  inputGroup: {
    marginBottom: SP.md,
  },

  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: C.textMuted,
    marginBottom: SP.xs,
  },

  inputShell: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    backgroundColor: C.background,
    paddingHorizontal: SP.md,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: SP.md,
    paddingLeft: SP.sm,
  },

  tripOptionsRow: {
    flexDirection: 'row',
  },

  tripOption: {
    flex: 1,
    minWidth: 0,
  },

  tripOptionSecond: {
    marginLeft: SP.md,
  },

  passengerRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: C.border,
    marginTop: SP.xs,
    paddingTop: SP.md,
  },

  passengerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SP.sm,
  },

  passengerIcon: {
    width: 40,
    height: 40,
    borderRadius: R.md,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SP.sm,
  },

  passengerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text,
  },

  passengerHint: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 2,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.pill,
    padding: 3,
  },

  stepperButton: {
    width: 34,
    height: 34,
    borderRadius: R.pill,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  passengerCount: {
    minWidth: 34,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '800',
    color: C.text,
  },

  searchError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.dangerSoft,
    borderRadius: R.md,
    padding: SP.md,
    marginTop: SP.md,
  },

  searchErrorText: {
    flex: 1,
    color: C.danger,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: SP.sm,
  },

  searchButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderRadius: R.md,
    marginTop: SP.lg,
    ...SHADOW,
  },

  searchButtonDisabled: {
    opacity: 0.7,
  },

  searchButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: SP.sm,
  },

  /* sample data notice */
  mockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.tint,
    borderRadius: R.md,
    padding: SP.md,
    marginBottom: SP.lg,
  },

  mockNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: C.secondary,
    marginLeft: SP.sm,
  },

  /* title row + filters button */
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SP.md,
  },

  titleText: {
    flex: 1,
    paddingRight: SP.md,
  },

  resultsTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },

  resultsCount: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 2,
  },

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: SP.lg,
    borderRadius: R.pill,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
  },

  filterButtonOn: {
    backgroundColor: C.tint,
    borderColor: C.primary,
  },

  filterButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.primary,
    marginLeft: SP.sm,
  },

  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: SP.sm,
  },

  badgeText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },

  /* filter panel */
  filterCard: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    padding: SP.xl,
    marginBottom: SP.lg,
    ...SHADOW,
  },

  filterLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: SP.sm,
  },

  filterLabelSpaced: {
    marginTop: SP.xl,
  },

  segWrap: {
    flexDirection: 'row',
    backgroundColor: C.tint,
    borderRadius: R.pill,
    padding: 4,
  },

  seg: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: R.pill,
  },

  segOn: {
    backgroundColor: C.primary,
  },

  segText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.secondary,
    marginLeft: 6,
  },

  segTextOn: {
    color: C.white,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: SP.lg,
    borderRadius: R.pill,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: SP.sm,
    marginBottom: SP.sm,
  },

  chipOn: {
    backgroundColor: C.tint,
    borderColor: C.primary,
  },

  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: C.text,
    marginLeft: 6,
  },

  chipTextOn: {
    color: C.primary,
    fontWeight: '700',
  },

  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 44,
    marginTop: SP.xs,
  },

  clearText: {
    color: C.primary,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },

  /* empty state */
  empty: {
    alignItems: 'center',
    marginTop: SP.xxxl,
    paddingHorizontal: SP.md,
  },

  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginTop: SP.xl,
    textAlign: 'center',
  },

  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    color: C.textMuted,
    marginTop: SP.sm,
    textAlign: 'center',
  },

  button: {
    height: 54,
    borderRadius: R.md,
    backgroundColor: C.text,
    paddingHorizontal: SP.xxxl,
    marginTop: SP.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
