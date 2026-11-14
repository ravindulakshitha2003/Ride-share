import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';

/* =======================================================
   DESIGN TOKENS (same as the results screen)
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
  success: '#16A34A',
  successSoft: '#E8F7EE',
  star: '#F59E0B',
  amber: '#B45309',
  amberSoft: '#FEF3C7',
  greySoft: '#F1F0F7',
  grey: '#6B7280',
};

const R = { sm: 12, md: 16, lg: 24, pill: 999 };
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
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
   HELPERS
======================================================= */

const VEHICLE_ICONS = {
  Car: 'car',
  Van: 'van-utility',
  SUV: 'car-estate',
  Other: 'dots-horizontal-circle-outline',
};

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

function hashString(value) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Deterministic "random" pick so the mock data stays the same for one ride.
function pickMany(pool, seed, count) {
  const start = seed % pool.length;
  return Array.from(
    { length: Math.min(count, pool.length) },
    (_, i) => pool[(start + i) % pool.length]
  );
}

/* ---------- Coordinates: accept several backend shapes ---------- */

function validCoord(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { latitude: lat, longitude: lng };
}

function toCoord(p) {
  if (!p) return null;

  if (typeof p === 'string') {
    try {
      return toCoord(JSON.parse(p));
    } catch {
      return null;
    }
  }

  // GeoJSON position: [lng, lat]
  if (Array.isArray(p) && p.length >= 2) {
    return validCoord(p[1], p[0]);
  }

  // GeoJSON Point
  if (p.type === 'Point' && Array.isArray(p.coordinates)) {
    return toCoord(p.coordinates);
  }

  return validCoord(p.latitude ?? p.lat, p.longitude ?? p.lng ?? p.lon);
}

function toLine(g) {
  if (!g) return [];

  if (typeof g === 'string') {
    try {
      return toLine(JSON.parse(g));
    } catch {
      return [];
    }
  }

  const list = Array.isArray(g) ? g : g.coordinates;
  if (!Array.isArray(list)) return [];

  return list.map(toCoord).filter(Boolean);
}

/* =======================================================
   MOCK DATA (replace with backend data later)
======================================================= */

const TOWNS = [
  'Kottawa',
  'Kahathuduwa',
  'Galagedara',
  'Welipenna',
  'Baddegama',
  'Pinnaduwa',
  'Ambalangoda',
  'Hikkaduwa',
  'Kalutara',
  'Panadura',
  'Moratuwa',
  'Weligama',
];

const PEOPLE = [
  { name: 'Anjali Wickrama', img: 21 },
  { name: 'Tharindu Silva', img: 52 },
  { name: 'Ishara Gunasekara', img: 44 },
  { name: 'Chamara Dissanayake', img: 68 },
  { name: 'Nethmi Rajapaksha', img: 25 },
];

const REVIEWS = [
  {
    name: 'Sachini P.',
    img: 5,
    rating: 5,
    date: 'Oct 2026',
    text: 'Very punctual and the car was spotless. Smooth driving the whole way.',
  },
  {
    name: 'Kavindu R.',
    img: 14,
    rating: 5,
    date: 'Sep 2026',
    text: 'Friendly driver, AC was cold and he waited at the pickup point.',
  },
  {
    name: 'Dineth M.',
    img: 31,
    rating: 4,
    date: 'Sep 2026',
    text: 'Good ride, arrived on time. Luggage space was a little tight.',
  },
  {
    name: 'Malsha F.',
    img: 49,
    rating: 5,
    date: 'Aug 2026',
    text: 'Felt very safe. Would definitely travel with him again.',
  },
  {
    name: 'Ruwan J.',
    img: 58,
    rating: 4,
    date: 'Jul 2026',
    text: 'Comfortable seats and a fair price compared to the bus.',
  },
];

const FEATURES = [
  { icon: 'snowflake', label: 'Air conditioning', needsAC: true },
  { icon: 'usb-port', label: 'USB charging' },
  { icon: 'music', label: 'Music / radio' },
  { icon: 'seatbelt', label: 'Seat belts' },
  { icon: 'bag-suitcase-outline', label: 'Luggage space' },
  { icon: 'baby-carriage', label: 'Child seat on request' },
  { icon: 'wifi', label: 'Wi-Fi hotspot' },
  { icon: 'water-outline', label: 'Water bottle' },
];

const RULES = [
  { icon: 'smoking-off', label: 'No smoking in the vehicle' },
  { icon: 'clock-check-outline', label: 'Be at the pickup point 5 minutes early' },
  { icon: 'paw-off', label: 'Pets only with the driver’s approval' },
  { icon: 'cash', label: 'Pay the driver or online after the booking is accepted' },
  { icon: 'calendar-remove-outline', label: 'Free cancellation up to 12 hours before departure' },
];

function buildMock(ride) {
  const seed = hashString(String(ride.id ?? 'ride'));
  const vehicleKey = `${ride.vehicleType || 'Car'}-${seed}`;

  const departure = ride.departureTime;
  const durationMin = Number(ride.durationMin) || 0;

  // Fake intermediate stops spread between departure and arrival.
  const stopCount = 4 + (seed % 2);
  const names = pickMany(TOWNS, seed, stopCount);

  // Build times from a parsed departure (e.g. "08:30 AM").
  const baseDate = new Date();
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(departure || '');
  if (match) {
    let h = Number(match[1]) % 12;
    if (match[3] === 'PM') h += 12;
    baseDate.setHours(h, Number(match[2]), 0, 0);
  }

  const stops = names.map((name, i) => {
    const fraction = (i + 1) / (stopCount + 1);
    const t = new Date(baseDate.getTime() + durationMin * fraction * 60000);
    return {
      name,
      time: formatTime(t),
      pickup: i % 3 !== 2, // some stops are drop-off only
    };
  });

  const seatsFree = Number(ride.seatsFree) || 0;
  const joinedCount = Math.min(3, 1 + (seed % 3));
  const joined = pickMany(PEOPLE, seed, joinedCount).map((person, i) => ({
    ...person,
    from: i === 0 ? ride.from : names[i % names.length],
    to: i === 1 ? names[names.length - 1] : ride.to,
  }));

  return {
    images: Array.from(
      { length: 5 },
      (_, i) => `https://picsum.photos/seed/${vehicleKey}-${i}/900/600`
    ),
    stops,
    joined,
    seatsTotal: seatsFree + joinedCount,
    vehicle: {
      colour: ['White', 'Silver', 'Black', 'Blue', 'Grey'][seed % 5],
      year: 2015 + (seed % 9),
      plate: `${['CAB', 'KV', 'PH', 'WP'][seed % 4]}-••••`,
      luggage: ['Available', 'Limited', 'Available'][seed % 3],
    },
    driverAbout: {
      about:
        'Full-time driver with several years of long-distance experience. I keep the car clean, leave on time and stick to safe speeds.',
      languages: ['Sinhala', 'English'],
      memberSince: String(2022 + (seed % 3)),
      responseRate: `${92 + (seed % 8)}%`,
    },
    reviews: pickMany(REVIEWS, seed, 5),
    distribution: [
      0.72 - (seed % 5) / 100,
      0.2,
      0.05,
      0.02,
      0.01,
    ],
  };
}

/* =======================================================
   SMALL COMPONENTS
======================================================= */

function PressScale({ onPress, disabled, style, children, label }) {
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function Avatar({ name, uri, size = 56, verified }) {
  const [failed, setFailed] = useState(false);
  const initial = (name || '?').charAt(0).toUpperCase();

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          s.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}
      >
        {uri && !failed ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size }}
            onError={() => setFailed(true)}
          />
        ) : (
          <Text style={[s.avatarText, { fontSize: size * 0.4 }]}>
            {initial}
          </Text>
        )}
      </View>

      {verified ? (
        <View style={s.verifiedBadge}>
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
  const t = TONES[tone];

  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      <Icon name={icon} size={15} color={t.fg} />
      <Text style={[s.pillText, { color: t.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title, icon, right, children }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <View style={s.sectionIcon}>
          <Icon name={icon} size={18} color={C.primary} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function SeeMore({ expanded, onPress, moreLabel, lessLabel = 'See less' }) {
  return (
    <Pressable
      onPress={onPress}
      style={s.seeMore}
      accessibilityRole="button"
      accessibilityLabel={expanded ? lessLabel : moreLabel}
      accessibilityState={{ expanded }}
    >
      <Text style={s.seeMoreText}>{expanded ? lessLabel : moreLabel}</Text>
      <Icon
        name={expanded ? 'chevron-up' : 'chevron-down'}
        size={18}
        color={C.primary}
      />
    </Pressable>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={s.detailRow}>
      <Icon name={icon} size={18} color={C.primary} />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

function Stars({ value, size = 14 }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name={n <= Math.round(value) ? 'star' : 'star-outline'}
          size={size}
          color={C.star}
        />
      ))}
    </View>
  );
}

/* =======================================================
   IMAGE SLIDER
======================================================= */

function ImageSlider({ images, width, topInset, onBack }) {
  const [index, setIndex] = useState(0);
  const HEIGHT = 270;

  return (
    <View style={{ width, height: HEIGHT, backgroundColor: C.tint }}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri) => uri}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width, height: HEIGHT }}
            resizeMode="cover"
          />
        )}
      />

      <Pressable
        onPress={onBack}
        style={[s.backButton, { top: topInset + SP.sm }]}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Icon name="arrow-left" size={22} color={C.text} />
      </Pressable>

      <View style={s.counter}>
        <Icon name="image-multiple-outline" size={14} color={C.white} />
        <Text style={s.counterText}>
          {index + 1}/{images.length}
        </Text>
      </View>

      <View style={s.dots}>
        {images.map((uri, i) => (
          <View key={uri} style={[s.dot, i === index && s.dotActive]} />
        ))}
      </View>
    </View>
  );
}

/* =======================================================
   ROUTE MAP
======================================================= */

function RouteMap({ pickup, dropoff, line, fromName, toName }) {
  const mapRef = useRef(null);

  const points = useMemo(() => {
    const all = line.length >= 2 ? line : [pickup, dropoff].filter(Boolean);
    return all;
  }, [line, pickup, dropoff]);

  useEffect(() => {
    if (points.length < 1) return undefined;

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 60, right: 50, bottom: 60, left: 50 },
        animated: false,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [points]);

  if (!pickup && !dropoff && line.length === 0) {
    return (
      <View style={s.mapEmpty}>
        <Icon name="map-marker-off-outline" size={30} color={C.grey} />
        <Text style={s.mapEmptyText}>Map location is not available.</Text>
      </View>
    );
  }

  const first = pickup || line[0];
  const last = dropoff || line[line.length - 1];

  function openDirections() {
    if (!first || !last) return;

    const url =
      'https://www.google.com/maps/dir/?api=1' +
      `&origin=${first.latitude},${first.longitude}` +
      `&destination=${last.latitude},${last.longitude}`;

    Linking.openURL(url).catch(() =>
      Alert.alert('Could not open maps', 'Please try again.')
    );
  }

  return (
    <View>
      <View style={s.mapWrap}>
        <MapView
          ref={mapRef}
          style={s.map}
          initialRegion={{
            latitude: first?.latitude ?? 7.8731,
            longitude: first?.longitude ?? 80.7718,
            latitudeDelta: 0.5,
            longitudeDelta: 0.5,
          }}
          toolbarEnabled={false}
        >
          {line.length >= 2 ? (
            <Polyline
              coordinates={line}
              strokeColor={C.primary}
              strokeWidth={5}
            />
          ) : null}

          {first ? (
            <Marker
              coordinate={first}
              title="Pickup"
              description={fromName}
              pinColor={C.success}
            />
          ) : null}

          {last ? (
            <Marker
              coordinate={last}
              title="Drop-off"
              description={toName}
              pinColor={C.danger}
            />
          ) : null}
        </MapView>
      </View>

      <Pressable
        onPress={openDirections}
        style={s.directionsButton}
        accessibilityRole="button"
        accessibilityLabel="Open route in Google Maps"
      >
        <Icon name="directions" size={18} color={C.primary} />
        <Text style={s.directionsText}>Open in Google Maps</Text>
      </Pressable>
    </View>
  );
}

/* =======================================================
   SCREEN
======================================================= */

export default function RideDetailsScreen({ route }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const params = useLocalSearchParams();

  const pageWidth = Math.min(screenWidth, MAX_W);

  // Works with expo-router params (JSON string) or React Navigation params (object).
  const ride = useMemo(() => {
    if (route?.params?.ride) return route.params.ride;

    try {
      return params.ride ? JSON.parse(String(params.ride)) : null;
    } catch {
      return null;
    }
  }, [route, params.ride]);

  const passengers = Math.max(
    1,
    Number(route?.params?.passengers ?? params.passengers) || 1
  );

  const [showAllStops, setShowAllStops] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [showAllJoined, setShowAllJoined] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showAboutMore, setShowAboutMore] = useState(false);
  const [showAllRules, setShowAllRules] = useState(false);

  const mock = useMemo(() => (ride ? buildMock(ride) : null), [ride]);

  if (!ride || !mock) {
    return (
      <View style={s.emptyScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Icon name="car-off" size={48} color={C.primary} />
        <Text style={s.emptyTitle}>Ride not found</Text>
        <Text style={s.emptyText}>
          Go back and choose a ride from the search results.
        </Text>
        <PressScale
          onPress={() => router.back()}
          label="Go back"
          style={s.emptyButton}
        >
          <Text style={s.emptyButtonText}>Go back</Text>
        </PressScale>
      </View>
    );
  }

  const driver = ride.driver || {};
  const hasAC = !!driver.hasAC;
  const seats = Number(ride.seatsFree) || 0;
  const rating = Number(driver.rating) || 0;
  const duration = formatDuration(ride.durationMin);
  const total = Number(ride.pricePerSeat) * passengers;
  const notEnoughSeats = seats < passengers;

  const pickupCoord = toCoord(ride.suggestedPickup) || toCoord(ride.searchPickup);
  const dropoffCoord = toCoord(ride.suggestedDropoff) || toCoord(ride.searchDropoff);
  const line = toLine(ride.matchedRouteSegment);

  const features = FEATURES.filter((f) => !f.needsAC || hasAC);
  const visibleStops = showAllStops ? mock.stops : mock.stops.slice(0, 2);
  const visibleFeatures = showAllFeatures ? features : features.slice(0, 4);
  const visibleJoined = showAllJoined ? mock.joined : mock.joined.slice(0, 2);
  const visibleReviews = showAllReviews ? mock.reviews : mock.reviews.slice(0, 2);
  const visibleRules = showAllRules ? RULES : RULES.slice(0, 2);

  function handleBook() {
    Alert.alert(
      'Request booking',
      `${passengers} seat${passengers === 1 ? '' : 's'} · ${formatPrice(total)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          // TODO: call the booking service here.
          onPress: () => Alert.alert('Booking request sent'),
        },
      ]
    );
  }

  return (
    <LinearGradient colors={[C.background, C.gradientEnd]} style={s.flex}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={s.flex}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.page, { width: pageWidth }]}>
          {/* ---------- Image slider ---------- */}
          <ImageSlider
            images={mock.images}
            width={pageWidth}
            topInset={insets.top}
            onBack={() => router.back()}
          />

          <View style={s.body}>
            {/* ---------- Summary card ---------- */}
            <View style={[s.card, s.summaryCard]}>
              <View style={s.topRow}>
                <Avatar
                  name={driver.name}
                  uri={driver.photoUrl}
                  verified={driver.verified}
                />

                <View style={s.driverInfo}>
                  <Text style={s.driverName} numberOfLines={1}>
                    {driver.name || 'Driver'}
                  </Text>

                  <View style={s.ratingRow}>
                    <Icon name="star" size={15} color={C.star} />
                    <Text style={s.ratingText}>
                      {rating > 0 ? rating.toFixed(1) : 'New'}
                    </Text>
                    {driver.ridesCount ? (
                      <Text style={s.ridesCount}>
                        {' '}· {driver.ridesCount} rides
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={s.priceBox}>
                  <Text style={s.price}>{formatPrice(ride.pricePerSeat)}</Text>
                  <Text style={s.perSeat}>per seat</Text>
                </View>
              </View>

              {/* Timeline */}
              <View style={s.timeline}>
                <View style={s.stop}>
                  <Text style={s.time}>{ride.departureTime}</Text>
                  <View style={s.dotCol}>
                    <View style={s.dotFrom} />
                  </View>
                  <Text style={s.place} numberOfLines={2}>
                    {ride.from}
                  </Text>
                </View>

                <View style={s.stop}>
                  <View style={s.timeSpacer} />
                  <View style={s.dotCol}>
                    <View style={s.line} />
                  </View>
                  {duration ? (
                    <View style={s.durationChip}>
                      <Icon
                        name="clock-outline"
                        size={13}
                        color={C.textMuted}
                      />
                      <Text style={s.durationText}>{duration}</Text>
                    </View>
                  ) : (
                    <View style={s.durationSpacer} />
                  )}
                </View>

                <View style={s.stop}>
                  <Text style={s.time}>{ride.arrivalTime}</Text>
                  <View style={s.dotCol}>
                    <Icon name="map-marker" size={20} color={C.primary} />
                  </View>
                  <Text style={s.place} numberOfLines={2}>
                    {ride.to}
                  </Text>
                </View>
              </View>

              <View style={s.divider} />

              <View style={s.pillRow}>
                <InfoPill
                  icon={VEHICLE_ICONS[ride.vehicleType] || VEHICLE_ICONS.Other}
                  label={driver.vehicle || ride.vehicleType}
                />
                <InfoPill
                  icon={hasAC ? 'snowflake' : 'snowflake-off'}
                  label={hasAC ? 'AC' : 'No AC'}
                  tone={hasAC ? 'green' : 'grey'}
                />
                <InfoPill
                  icon="seat-passenger"
                  label={
                    seats <= 0
                      ? 'Full'
                      : `${seats} seat${seats === 1 ? '' : 's'} left`
                  }
                  tone={seats <= 2 ? 'amber' : 'violet'}
                />
                {driver.verified ? (
                  <InfoPill
                    icon="check-decagram"
                    label="Verified"
                    tone="green"
                  />
                ) : null}
              </View>
            </View>

            {/* ---------- Trip facts ---------- */}
            <View style={s.factsRow}>
              <View style={s.fact}>
                <Icon name="map-marker-distance" size={20} color={C.primary} />
                <Text style={s.factValue}>
                  {formatDistance(ride.rideDistanceMeters) || '-'}
                </Text>
                <Text style={s.factLabel}>Your ride</Text>
              </View>

              <View style={s.fact}>
                <Icon name="walk" size={20} color={C.primary} />
                <Text style={s.factValue}>
                  {formatDistance(ride.pickupDistanceMeters) || '-'}
                </Text>
                <Text style={s.factLabel}>To pickup</Text>
              </View>

              <View style={s.fact}>
                <Icon name="flag-checkered" size={20} color={C.primary} />
                <Text style={s.factValue}>
                  {formatDistance(ride.dropoffDistanceMeters) || '-'}
                </Text>
                <Text style={s.factLabel}>From drop-off</Text>
              </View>
            </View>

            {/* ---------- Map ---------- */}
            <Section title="Route on the map" icon="map-outline">
              <RouteMap
                pickup={pickupCoord}
                dropoff={dropoffCoord}
                line={line}
                fromName={ride.from}
                toName={ride.to}
              />
            </Section>

            {/* ---------- Intermediate stops ---------- */}
            <Section
              title="Stops along the route"
              icon="map-marker-path"
              right={
                <Text style={s.sectionMeta}>{mock.stops.length} stops</Text>
              }
            >
              <View>
                <View style={s.stopItem}>
                  <View style={s.stopRail}>
                    <View style={s.stopDotEdge} />
                    <View style={s.stopRailLine} />
                  </View>
                  <View style={s.stopText}>
                    <Text style={s.stopName}>{ride.from}</Text>
                    <Text style={s.stopSub}>
                      Start · {ride.departureTime}
                    </Text>
                  </View>
                </View>

                {visibleStops.map((stop) => (
                  <View key={stop.name} style={s.stopItem}>
                    <View style={s.stopRail}>
                      <View style={s.stopDot} />
                      <View style={s.stopRailLine} />
                    </View>
                    <View style={s.stopText}>
                      <Text style={s.stopName}>{stop.name}</Text>
                      <Text style={s.stopSub}>
                        {stop.time} ·{' '}
                        {stop.pickup ? 'Pickup & drop-off' : 'Drop-off only'}
                      </Text>
                    </View>
                  </View>
                ))}

                <View style={s.stopItem}>
                  <View style={s.stopRail}>
                    <Icon name="map-marker" size={20} color={C.primary} />
                  </View>
                  <View style={s.stopText}>
                    <Text style={s.stopName}>{ride.to}</Text>
                    <Text style={s.stopSub}>
                      End · {ride.arrivalTime}
                    </Text>
                  </View>
                </View>
              </View>

              {mock.stops.length > 2 ? (
                <SeeMore
                  expanded={showAllStops}
                  onPress={() => setShowAllStops((v) => !v)}
                  moreLabel={`See all ${mock.stops.length} stops`}
                />
              ) : null}
            </Section>

            {/* ---------- Vehicle ---------- */}
            <Section title="Vehicle" icon="car-info">
              <DetailRow
                icon="car"
                label="Vehicle"
                value={driver.vehicle || ride.vehicleType}
              />
              <DetailRow
                icon="car-side"
                label="Type"
                value={ride.vehicleType}
              />
              <DetailRow
                icon="palette-outline"
                label="Colour"
                value={mock.vehicle.colour}
              />
              <DetailRow
                icon="calendar-outline"
                label="Year"
                value={String(mock.vehicle.year)}
              />
              <DetailRow
                icon="seat-passenger"
                label="Passenger seats"
                value={String(mock.seatsTotal)}
              />
              <DetailRow
                icon="bag-suitcase-outline"
                label="Luggage"
                value={mock.vehicle.luggage}
              />
              <DetailRow
                icon="card-text-outline"
                label="Number plate"
                value={mock.vehicle.plate}
              />

              <Text style={s.subHeading}>Features</Text>
              <View style={s.pillRow}>
                {visibleFeatures.map((f) => (
                  <InfoPill key={f.label} icon={f.icon} label={f.label} />
                ))}
              </View>

              {features.length > 4 ? (
                <SeeMore
                  expanded={showAllFeatures}
                  onPress={() => setShowAllFeatures((v) => !v)}
                  moreLabel={`See ${features.length - 4} more features`}
                />
              ) : null}
            </Section>

            {/* ---------- Driver ---------- */}
            <Section title="About the driver" icon="account-tie-outline">
              <View style={s.driverRow}>
                <Avatar
                  name={driver.name}
                  uri={driver.photoUrl}
                  size={48}
                  verified={driver.verified}
                />
                <View style={s.driverInfo}>
                  <Text style={s.driverName}>{driver.name || 'Driver'}</Text>
                  <Text style={s.stopSub}>
                    Member since {mock.driverAbout.memberSince}
                  </Text>
                </View>
              </View>

              <Text
                style={s.bodyText}
                numberOfLines={showAboutMore ? undefined : 2}
              >
                {mock.driverAbout.about}
              </Text>

              {showAboutMore ? (
                <View style={s.aboutExtra}>
                  <DetailRow
                    icon="translate"
                    label="Languages"
                    value={mock.driverAbout.languages.join(', ')}
                  />
                  <DetailRow
                    icon="message-reply-text-outline"
                    label="Response rate"
                    value={mock.driverAbout.responseRate}
                  />
                  <DetailRow
                    icon="car-multiple"
                    label="Completed rides"
                    value={String(driver.ridesCount ?? 0)}
                  />
                </View>
              ) : null}

              <SeeMore
                expanded={showAboutMore}
                onPress={() => setShowAboutMore((v) => !v)}
                moreLabel="See more"
              />
            </Section>

            {/* ---------- Co-passengers ---------- */}
            <Section
              title="Who’s riding"
              icon="account-group-outline"
              right={
                <Text style={s.sectionMeta}>
                  {mock.joined.length} joined · {seats} left
                </Text>
              }
            >
              {/* Seat bar */}
              <View style={s.seatBar}>
                {Array.from({ length: mock.seatsTotal }, (_, i) => (
                  <View
                    key={i}
                    style={[
                      s.seatBlock,
                      i < mock.joined.length && s.seatBlockTaken,
                    ]}
                  />
                ))}
              </View>

              {visibleJoined.map((person) => (
                <View key={person.name} style={s.personRow}>
                  <Avatar
                    name={person.name}
                    uri={`https://i.pravatar.cc/150?img=${person.img}`}
                    size={44}
                  />
                  <View style={s.personText}>
                    <Text style={s.personName}>{person.name}</Text>
                    <Text style={s.stopSub} numberOfLines={1}>
                      {person.from} → {person.to}
                    </Text>
                  </View>
                </View>
              ))}

              {mock.joined.length > 2 ? (
                <SeeMore
                  expanded={showAllJoined}
                  onPress={() => setShowAllJoined((v) => !v)}
                  moreLabel={`See all ${mock.joined.length} riders`}
                />
              ) : null}
            </Section>

            {/* ---------- Reviews ---------- */}
            <Section title="Reviews" icon="star-outline">
              <View style={s.reviewSummary}>
                <View style={s.reviewScore}>
                  <Text style={s.reviewScoreText}>
                    {rating > 0 ? rating.toFixed(1) : '-'}
                  </Text>
                  <Stars value={rating} />
                  <Text style={s.stopSub}>
                    {driver.ridesCount ?? 0} rides
                  </Text>
                </View>

                <View style={s.bars}>
                  {mock.distribution.map((share, i) => (
                    <View key={i} style={s.barRow}>
                      <Text style={s.barLabel}>{5 - i}</Text>
                      <View style={s.barTrack}>
                        <View
                          style={[
                            s.barFill,
                            { width: `${Math.max(2, share * 100)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {visibleReviews.map((review) => (
                <View key={review.name} style={s.review}>
                  <View style={s.personRow}>
                    <Avatar
                      name={review.name}
                      uri={`https://i.pravatar.cc/150?img=${review.img}`}
                      size={38}
                    />
                    <View style={s.personText}>
                      <Text style={s.personName}>{review.name}</Text>
                      <View style={s.starMeta}>
                        <Stars value={review.rating} size={12} />
                        <Text style={s.stopSub}> · {review.date}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={s.bodyText}>{review.text}</Text>
                </View>
              ))}

              <SeeMore
                expanded={showAllReviews}
                onPress={() => setShowAllReviews((v) => !v)}
                moreLabel={`See all ${mock.reviews.length} reviews`}
              />
            </Section>

            {/* ---------- Rules ---------- */}
            <Section title="Ride rules" icon="shield-check-outline">
              {visibleRules.map((rule) => (
                <View key={rule.label} style={s.ruleRow}>
                  <Icon name={rule.icon} size={20} color={C.primary} />
                  <Text style={s.ruleText}>{rule.label}</Text>
                </View>
              ))}

              <SeeMore
                expanded={showAllRules}
                onPress={() => setShowAllRules((v) => !v)}
                moreLabel={`See ${RULES.length - 2} more rules`}
              />
            </Section>
          </View>
        </View>
      </ScrollView>

      {/* ---------- Fixed booking bar ---------- */}
      <View style={[s.bookBar, { paddingBottom: insets.bottom + SP.md }]}>
        <View style={[s.bookInner, { maxWidth: MAX_W }]}>
          <View>
            <Text style={s.bookTotal}>{formatPrice(total)}</Text>
            <Text style={s.bookSub}>
              {passengers} seat{passengers === 1 ? '' : 's'}
            </Text>
          </View>

          <PressScale
            onPress={handleBook}
            disabled={notEnoughSeats}
            label="Book this ride"
            style={[s.bookButton, notEnoughSeats && s.bookButtonDisabled]}
          >
            <Icon name="ticket-confirmation-outline" size={20} color={C.white} />
            <Text style={s.bookButtonText}>
              {notEnoughSeats ? 'Not enough seats' : 'Book now'}
            </Text>
          </PressScale>
        </View>
      </View>
    </LinearGradient>
  );
}

/* =======================================================
   STYLES
======================================================= */

const s = StyleSheet.create({
  flex: { flex: 1 },

  page: { alignSelf: 'center' },

  body: {
    paddingHorizontal: SP.xl,
    paddingTop: SP.lg,
  },

  /* slider */
  backButton: {
    position: 'absolute',
    left: SP.lg,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  counter: {
    position: 'absolute',
    right: SP.lg,
    bottom: SP.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: R.pill,
    paddingHorizontal: SP.md,
    paddingVertical: 5,
  },
  counterText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 5,
  },
  dots: {
    position: 'absolute',
    bottom: SP.lg,
    alignSelf: 'center',
    flexDirection: 'row',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    marginHorizontal: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: C.white,
  },

  /* cards */
  card: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    padding: SP.xl,
    ...SHADOW,
  },
  summaryCard: { marginBottom: SP.lg },

  topRow: { flexDirection: 'row', alignItems: 'center' },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SP.md },
  driverInfo: { flex: 1, marginLeft: SP.md, paddingRight: SP.sm },
  driverName: { fontSize: 17, fontWeight: '800', color: C.text },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  ratingText: { fontSize: 14, fontWeight: '700', color: C.text, marginLeft: 3 },
  ridesCount: { fontSize: 13, color: C.textMuted },
  priceBox: { alignItems: 'flex-end' },
  price: { fontSize: 20, fontWeight: '800', color: C.primary },
  perSeat: { fontSize: 12, color: C.textMuted, marginTop: 1 },

  avatar: {
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: C.tint,
  },
  avatarText: { color: C.white, fontWeight: '800' },
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

  /* timeline */
  timeline: { marginTop: SP.xl },
  stop: { flexDirection: 'row', alignItems: 'center' },
  time: { width: 76, fontSize: 14, fontWeight: '700', color: C.text },
  timeSpacer: { width: 76 },
  dotCol: { width: 24, alignItems: 'center', justifyContent: 'center' },
  dotFrom: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: C.primary,
    backgroundColor: C.white,
  },
  line: { width: 2, height: 34, backgroundColor: C.line },
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
  durationSpacer: { height: 34 },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginTop: SP.lg,
    marginBottom: SP.md,
  },

  /* pills */
  pillRow: { flexDirection: 'row', flexWrap: 'wrap' },
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

  /* facts */
  factsRow: { flexDirection: 'row', marginBottom: SP.lg },
  fact: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: R.md,
    paddingVertical: SP.md,
    alignItems: 'center',
    marginHorizontal: 4,
    ...SHADOW,
  },
  factValue: { fontSize: 15, fontWeight: '800', color: C.text, marginTop: 4 },
  factLabel: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  /* sections */
  section: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    padding: SP.xl,
    marginBottom: SP.lg,
    ...SHADOW,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SP.lg,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: R.sm,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SP.md,
  },
  sectionTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: C.text },
  sectionMeta: { fontSize: 12, fontWeight: '600', color: C.textMuted },
  subHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: C.text,
    marginTop: SP.lg,
    marginBottom: SP.sm,
  },

  seeMore: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 40,
    marginTop: SP.xs,
  },
  seeMoreText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '800',
    marginRight: 2,
  },

  bodyText: { fontSize: 14, lineHeight: 21, color: C.text, marginTop: SP.xs },
  aboutExtra: { marginTop: SP.md },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SP.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailLabel: {
    flex: 1,
    fontSize: 14,
    color: C.textMuted,
    marginLeft: SP.md,
  },
  detailValue: { fontSize: 14, fontWeight: '700', color: C.text },

  /* map */
  mapWrap: {
    height: 220,
    borderRadius: R.md,
    overflow: 'hidden',
    backgroundColor: C.tint,
  },
  map: { flex: 1 },
  mapEmpty: {
    height: 120,
    borderRadius: R.md,
    backgroundColor: C.greySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapEmptyText: { color: C.grey, fontSize: 13, marginTop: SP.sm },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: SP.md,
    borderRadius: R.md,
    backgroundColor: C.tint,
  },
  directionsText: {
    color: C.primary,
    fontWeight: '800',
    fontSize: 14,
    marginLeft: 6,
  },

  /* stops */
  stopItem: { flexDirection: 'row', minHeight: 54 },
  stopRail: { width: 24, alignItems: 'center' },
  stopDotEdge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: C.primary,
    backgroundColor: C.white,
    marginTop: 3,
  },
  stopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: C.line,
    marginTop: 5,
  },
  stopRailLine: {
    flex: 1,
    width: 2,
    backgroundColor: C.line,
    marginTop: 2,
  },
  stopText: { flex: 1, marginLeft: SP.md, paddingBottom: SP.md },
  stopName: { fontSize: 15, fontWeight: '700', color: C.text },
  stopSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  /* riders */
  seatBar: { flexDirection: 'row', marginBottom: SP.lg },
  seatBlock: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.border,
    marginHorizontal: 2,
  },
  seatBlockTaken: { backgroundColor: C.primary },
  personRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SP.md },
  personText: { flex: 1, marginLeft: SP.md },
  personName: { fontSize: 15, fontWeight: '700', color: C.text },

  /* reviews */
  reviewSummary: { flexDirection: 'row', alignItems: 'center', marginBottom: SP.lg },
  reviewScore: { alignItems: 'center', width: 100 },
  reviewScoreText: { fontSize: 34, fontWeight: '800', color: C.text },
  starRow: { flexDirection: 'row' },
  starMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  bars: { flex: 1, marginLeft: SP.md },
  barRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 2 },
  barLabel: { width: 14, fontSize: 12, color: C.textMuted },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.border,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.star },
  review: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: SP.md,
    marginTop: SP.xs,
    marginBottom: SP.sm,
  },

  /* rules */
  ruleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SP.sm },
  ruleText: { flex: 1, fontSize: 14, color: C.text, marginLeft: SP.md },

  /* booking bar */
  bookBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.white,
    paddingTop: SP.md,
    paddingHorizontal: SP.xl,
    borderTopLeftRadius: R.lg,
    borderTopRightRadius: R.lg,
    ...Platform.select({
      ios: {
        shadowColor: C.secondary,
        shadowOpacity: 0.15,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
      },
      android: { elevation: 16 },
      default: {},
    }),
  },
  bookInner: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bookTotal: { fontSize: 22, fontWeight: '800', color: C.text },
  bookSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  bookButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderRadius: R.md,
    paddingHorizontal: SP.xxxl,
    ...SHADOW,
  },
  bookButtonDisabled: { opacity: 0.5 },
  bookButtonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: SP.sm,
  },

  /* not found */
  emptyScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.background,
    padding: SP.xxl,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: SP.lg },
  emptyText: {
    fontSize: 15,
    color: C.textMuted,
    textAlign: 'center',
    marginTop: SP.sm,
  },
  emptyButton: {
    height: 54,
    borderRadius: R.md,
    backgroundColor: C.text,
    paddingHorizontal: SP.xxxl,
    marginTop: SP.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButtonText: { color: C.white, fontSize: 16, fontWeight: '700' },
});