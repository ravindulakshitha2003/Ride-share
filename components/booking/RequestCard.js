// =============================================================================
// RequestCard - one row in the Incoming Requests list (D1).
// Shows just enough for the driver to decide whether to open it:
// pickup -> dropoff, seats, detour cost, and how long ago it arrived.
// =============================================================================

import { Pressable, StyleSheet, Text, View } from 'react-native';
import StatusBadge from './StatusBadge';
import { formatDistance, formatDuration, timeAgo } from '../../utils/bookingFormat';

export default function RequestCard({ request, onPress }) {
  const { pickup, dropoff, requestedSeats, detour, createdAt, status } = request;

  return (
    // Pressable = a touchable area. `pressed` lets us dim the card while held.
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Ride request from ${pickup.name} to ${dropoff.name}`}
    >
      <View style={styles.headerRow}>
        <StatusBadge status={status} />
        <Text style={styles.time}>{timeAgo(createdAt)}</Text>
      </View>

      {/* Route: pickup dot, line, dropoff dot */}
      <View style={styles.routeRow}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotPickup]} />
          <View style={styles.line} />
          <View style={[styles.dot, styles.dotDropoff]} />
        </View>
        <View style={styles.places}>
          <Text style={styles.place} numberOfLines={1}>{pickup.name}</Text>
          <Text style={styles.place} numberOfLines={1}>{dropoff.name}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.meta}>
          {requestedSeats} seat{requestedSeats > 1 ? 's' : ''}
        </Text>
        <Text style={styles.meta}>
          {detour.extraDistanceM > 0
            ? `+${formatDistance(detour.extraDistanceM)} · +${formatDuration(detour.extraDurationSeconds)}`
            : 'No detour'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    // shadow (iOS) + elevation (Android)
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardPressed: { opacity: 0.7 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: 12, color: '#777' },
  routeRow: { flexDirection: 'row', marginTop: 14 },
  dots: { alignItems: 'center', marginRight: 12, paddingVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotPickup: { backgroundColor: '#1B7A3D' },
  dotDropoff: { backgroundColor: '#B42318' },
  line: { width: 2, flex: 1, backgroundColor: '#DDD', marginVertical: 2 },
  places: { flex: 1, justifyContent: 'space-between', gap: 14 },
  place: { fontSize: 15, fontWeight: '600', color: '#111' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
  },
  meta: { fontSize: 13, color: '#444' },
});
