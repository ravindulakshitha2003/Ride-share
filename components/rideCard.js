// React Native building blocks
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Icons that come with Expo
import { Ionicons } from '@expo/vector-icons';
// Your palette
import { colors } from '../theme/colors';
// Helper that turns minutes into text like "2h 30m"
import { formatDuration } from '../utils/date';

// One ride in the results list: times, route, price, driver and free seats
export default function RideCard({ ride, onPress }) {
  // First letter of the driver's name for the avatar circle
  const initial = ride.driver.name.charAt(0).toUpperCase();

  return (
    // The whole card is tappable
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        {/* Left column: departure time, journey length, arrival time */}
        <View style={styles.timeCol}>
          <Text style={styles.time}>{ride.departureTime}</Text>
          <Text style={styles.duration}>{formatDuration(ride.durationMin)}</Text>
          <Text style={styles.time}>{ride.arrivalTime}</Text>
        </View>

        {/* Middle: a dot, a line and a dot joining start and destination */}
        <View style={styles.line}>
          <View style={styles.dot} />
          <View style={styles.bar} />
          <View style={[styles.dot, styles.dotEnd]} />
        </View>

        {/* Place names: start at the top, destination at the bottom */}
        <View style={styles.placeCol}>
          <Text style={styles.place} numberOfLines={1}>{ride.from}</Text>
          <Text style={styles.place} numberOfLines={1}>{ride.to}</Text>
        </View>

        {/* Right column: fare per seat */}
        <View style={styles.priceCol}>
          <Text style={styles.price}>Rs. {ride.pricePerSeat}</Text>
          <Text style={styles.perSeat}>per seat</Text>
        </View>
      </View>

      {/* Thin line between the route and the driver row */}
      <View style={styles.divider} />

      {/* Driver row: avatar, name, rating and free seats */}
      <View style={styles.footer}>
        {/* Round avatar with the driver's initial */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.driverInfo}>
          {/* Name, with a tick when the driver is verified */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{ride.driver.name}</Text>
            {ride.driver.verified ? <Ionicons name="shield-checkmark" size={14} color="#16A34A" style={styles.tick} /> : null}
          </View>
          {/* Star rating and air conditioning */}
          <View style={styles.nameRow}>
            <Ionicons name="star" size={12} color="#F59E0B" />
            <Text style={styles.meta}> {ride.driver.rating.toFixed(1)}</Text>
            {ride.driver.hasAC ? <Text style={styles.meta}>  ·  A/C</Text> : null}
          </View>
        </View>
        {/* Free seats badge */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{ride.seatsFree} {ride.seatsFree === 1 ? 'seat' : 'seats'} left</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Styles for this component
const styles = StyleSheet.create({
  // White rounded card with a soft shadow
  card: {
    backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border, elevation: 2,
    shadowColor: colors.secondary, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  // Route area: columns side by side
  row: { flexDirection: 'row' },
  // Times column; space-between puts departure at the top and arrival at the bottom
  timeCol: { height: 78, justifyContent: 'space-between', alignItems: 'flex-end', width: 52 },
  // Departure and arrival times
  time: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  // Journey length text
  duration: { fontSize: 12, color: colors.text, opacity: 0.6 },
  // Column holding the dots and the line
  line: { height: 78, alignItems: 'center', marginHorizontal: 12, paddingVertical: 6 },
  // Hollow circle for the start
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.white },
  // Filled circle for the destination
  dotEnd: { backgroundColor: colors.primary },
  // Vertical line between the circles
  bar: { flex: 1, width: 2, backgroundColor: colors.border },
  // Place names column
  placeCol: { height: 78, justifyContent: 'space-between', flex: 1 },
  // A place name
  place: { fontSize: 16, color: colors.text },
  // Price column
  priceCol: { alignItems: 'flex-end', justifyContent: 'flex-start' },
  // Price text
  price: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  // Small "per seat" text
  perSeat: { fontSize: 12, color: colors.text, opacity: 0.6 },
  // Divider line
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  // Driver row
  footer: { flexDirection: 'row', alignItems: 'center' },
  // Round avatar
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  // Initial inside the avatar
  avatarText: { color: colors.white, fontWeight: 'bold', fontSize: 16 },
  // Name and rating block
  driverInfo: { flex: 1, marginLeft: 10 },
  // Icon and text on one line
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  // Driver name
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  // Space before the verified tick
  tick: { marginLeft: 4 },
  // Rating text
  meta: { fontSize: 12, color: colors.text, opacity: 0.7 },
  // Pale violet pill showing the free seats
  badge: { backgroundColor: '#EEEBFF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  // Text inside the pill
  badgeText: { color: colors.primary, fontWeight: '600', fontSize: 12 },
});