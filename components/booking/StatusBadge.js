// =============================================================================
// StatusBadge - small coloured pill showing a booking status.
// Usage: <StatusBadge status="PENDING" />
// =============================================================================

import { StyleSheet, Text, View } from 'react-native';

// Colour for each status. Same names as the backend's BookingStatus.
const STATUS_STYLE = {
  PENDING: { bg: '#FFF4E0', fg: '#A15C00', label: 'Pending' },
  CONFIRMED: { bg: '#E3F6EA', fg: '#1B7A3D', label: 'Confirmed' },
  REJECTED: { bg: '#FDE7E7', fg: '#B42318', label: 'Rejected' },
  CANCELLED: { bg: '#EEEEEE', fg: '#555555', label: 'Cancelled' },
  COMPLETED: { bg: '#E6EEFB', fg: '#1D4ED8', label: 'Completed' },
};

export default function StatusBadge({ status }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.CANCELLED;

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }]}>
      <Text style={[styles.text, { color: style.fg }]}>{style.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: { fontSize: 12, fontWeight: '700' },
});
