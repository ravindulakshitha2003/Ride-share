// =============================================================================
// D2 - REQUEST DETAILS SCREEN  (accept / reject)   (Expo Router route: /booking-details)
//
// Opened from D1 with:  router.push({ pathname: '/booking-details', params: { bookingId } })
//
// What it does:
//   - loads full details of one booking
//   - shows pickup / dropoff (with "open in maps"), seats, note, detour cost,
//     and the status timeline
//   - shows ONLY the buttons the backend says are allowed (allowedActions):
//       PENDING   -> Accept, Reject
//       CONFIRMED -> Complete trip, Cancel   (bonus: rest of the lifecycle)
//       final     -> no buttons
//   - handles 409 conflicts (e.g. passenger cancelled a second ago)
// =============================================================================

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';

import StatusBadge from '../../components/booking/StatusBadge';
import ReasonModal from '../../components/booking/ReasonModal';
import {
  acceptRequest,
  cancelBookingAsDriver,
  completeBooking,
  getRequestDetails,
  rejectRequest,
} from '../../api/bookingApi';
import {
  describeMode,
  formatDateTime,
  formatDistance,
  formatDuration,
} from '../../utils/bookingFormat';

export default function BookingDetailsScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // bookingId was passed from D1 (route params are always text)
  const params = useLocalSearchParams();
  const bookingId = Array.isArray(params.bookingId) ? params.bookingId[0] : params.bookingId;

  // Show a title bar with a back arrow for this screen.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true, title: 'Request Details' });
  }, [navigation]);

  // Go back to D1 (or open D1 if there is nothing to go back to).
  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/booking');
  }

  // ---- State ---------------------------------------------------------------
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Which action is running right now ('ACCEPT', 'REJECT', ...) or null.
  // Used to show a spinner on that button and disable all buttons.
  const [busyAction, setBusyAction] = useState(null);
  // Which reason popup is open: 'REJECT' | 'CANCEL' | null
  const [reasonFor, setReasonFor] = useState(null);

  // ---- Load ------------------------------------------------------------------
  const load = useCallback(async () => {
    if (!bookingId) {
      setError('No booking was selected. Open a request from the Ride Requests list.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await getRequestDetails(bookingId);
      setBooking(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Run an action (shared by all buttons) ----------------------------------
  /**
   * @param {string}   action      'ACCEPT' | 'REJECT' | 'CANCEL' | 'COMPLETE'
   * @param {Function} apiCall     function that calls the backend
   * @param {string}   successText message shown after success
   * @param {boolean}  goBack      return to D1 afterwards?
   */
  async function runAction(action, apiCall, successText, goBack) {
    setBusyAction(action);
    try {
      const updated = await apiCall();
      setBooking(updated); // backend returns the fresh booking
      setReasonFor(null);

      if (goBack) {
        Alert.alert('Done', successText, [{ text: 'OK', onPress: goBack }]);
      } else {
        Alert.alert('Done', successText);
      }
    } catch (err) {
      setReasonFor(null);

      if (err.status === 409) {
        // The booking changed (passenger cancelled, seats full, already handled).
        // Show why, then reload so the screen shows the real current status.
        Alert.alert('Could not complete action', err.message);
        load();
      } else {
        Alert.alert('Something went wrong', err.message);
      }
    } finally {
      setBusyAction(null);
    }
  }

  // ---- Button handlers ---------------------------------------------------------
  function handleAccept() {
    // Confirm first - accepting reserves seats and notifies the passenger.
    Alert.alert(
      'Accept this request?',
      `${booking.requestedSeats} seat(s) will be reserved for this passenger.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => runAction('ACCEPT', () => acceptRequest(bookingId), 'Request accepted. The passenger will be notified.', true),
        },
      ],
    );
  }

  function handleReasonConfirm(reason) {
    if (reasonFor === 'REJECT') {
      runAction('REJECT', () => rejectRequest(bookingId, reason), 'Request rejected.', true);
    } else if (reasonFor === 'CANCEL') {
      runAction('CANCEL', () => cancelBookingAsDriver(bookingId, reason), 'Booking cancelled.', true);
    }
  }

  function handleComplete() {
    Alert.alert('Mark trip as completed?', 'Do this after dropping off the passenger.', [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Complete',
        onPress: () => runAction('COMPLETE', () => completeBooking(bookingId), 'Trip marked as completed.', false),
      },
    ]);
  }

  // Opens Google Maps (or Apple Maps fallback) with directions pickup -> dropoff.
  // No extra library needed - just a URL.
  function openInMaps() {
    const { pickup, dropoff } = booking;
    const url =
      'https://www.google.com/maps/dir/?api=1' +
      `&origin=${pickup.latitude},${pickup.longitude}` +
      `&destination=${dropoff.latitude},${dropoff.longitude}`;
    Linking.openURL(url).catch(() => Alert.alert('Could not open maps'));
  }

  // ---- Render: loading / error ------------------------------------------------
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !booking) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load this request</Text>
        <Text style={styles.muted}>{error}</Text>
        <Pressable style={styles.darkBtn} onPress={load}>
          <Text style={styles.darkBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  // ---- Render: details ----------------------------------------------------------
  const can = (action) => booking.allowedActions.includes(action);
  const isBusy = busyAction !== null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* ---- Summary ---- */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <StatusBadge status={booking.status} />
            <Text style={styles.muted}>{formatDateTime(booking.createdAt)}</Text>
          </View>

          <View style={styles.statsRow}>
            <Stat label="Seats" value={String(booking.requestedSeats)} />
            <Stat label="Extra distance" value={formatDistance(booking.detour.extraDistanceM)} />
            <Stat label="Extra time" value={formatDuration(booking.detour.extraDurationSeconds)} />
          </View>

          {/* Passenger name/photo would come from the User Service.
              For now we show the id. */}
          <Text style={styles.label}>Passenger</Text>
          <Text style={styles.value}>{booking.passengerId}</Text>

          {booking.note ? (
            <>
              <Text style={styles.label}>Note from passenger</Text>
              <Text style={styles.note}>"{booking.note}"</Text>
            </>
          ) : null}
        </View>

        {/* ---- Pickup & dropoff ---- */}
        <View style={styles.card}>
          <PointRow color="#1B7A3D" title="Pickup" point={booking.pickup} />
          <View style={styles.divider} />
          <PointRow color="#B42318" title="Drop-off" point={booking.dropoff} />

          <Pressable style={styles.outlineBtn} onPress={openInMaps}>
            <Text style={styles.outlineBtnText}>Open route in Maps</Text>
          </Pressable>
        </View>

        {/* ---- Reasons (only when present) ---- */}
        {booking.rejectReason ? (
          <View style={styles.card}>
            <Text style={styles.label}>Reject reason</Text>
            <Text style={styles.value}>{booking.rejectReason}</Text>
          </View>
        ) : null}
        {booking.cancelReason ? (
          <View style={styles.card}>
            <Text style={styles.label}>
              Cancelled by {booking.cancelledBy?.toLowerCase()}
            </Text>
            <Text style={styles.value}>{booking.cancelReason}</Text>
          </View>
        ) : null}

        {/* ---- Timeline ---- */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          {booking.history.map((h, index) => (
            <View key={`${h.newStatus}-${index}`} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.value}>{h.newStatus}</Text>
                <Text style={styles.muted}>
                  {formatDateTime(h.changedAt)}
                  {h.reason ? ` · ${h.reason}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ---- Bottom action bar (only allowed actions) ---- */}
      {booking.allowedActions.length > 0 && (
        <View style={styles.actionBar}>
          {can('REJECT') && (
            <ActionButton label="Reject" variant="danger" busy={busyAction === 'REJECT'} disabled={isBusy} onPress={() => setReasonFor('REJECT')} />
          )}
          {can('ACCEPT') && (
            <ActionButton label="Accept" variant="primary" busy={busyAction === 'ACCEPT'} disabled={isBusy} onPress={handleAccept} />
          )}
          {can('CANCEL') && (
            <ActionButton label="Cancel booking" variant="danger" busy={busyAction === 'CANCEL'} disabled={isBusy} onPress={() => setReasonFor('CANCEL')} />
          )}
          {can('COMPLETE') && (
            <ActionButton label="Complete trip" variant="primary" busy={busyAction === 'COMPLETE'} disabled={isBusy} onPress={handleComplete} />
          )}
        </View>
      )}

      <ReasonModal
        visible={reasonFor !== null}
        title={reasonFor === 'REJECT' ? 'Reject request' : 'Cancel booking'}
        confirmLabel={reasonFor === 'REJECT' ? 'Reject' : 'Cancel booking'}
        loading={busyAction === 'REJECT' || busyAction === 'CANCEL'}
        onConfirm={handleReasonConfirm}
        onCancel={() => setReasonFor(null)}
      />
    </View>
  );
}

// =============================================================================
// Small sub-components used only on this screen
// =============================================================================

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PointRow({ color, title, point }) {
  return (
    <View style={styles.pointRow}>
      <View style={[styles.pointDot, { backgroundColor: color }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{title}</Text>
        <Text style={styles.value}>{point.name}</Text>
        <Text style={styles.muted}>
          {describeMode(point.mode)}
          {point.walkDistanceM > 0 ? ` · walks ${formatDistance(point.walkDistanceM)}` : ''}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({ label, variant, busy, disabled, onPress }) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.actionBtn, isPrimary ? styles.primaryBtn : styles.dangerOutlineBtn, disabled && styles.disabled]}
      accessibilityRole="button"
    >
      {busy ? (
        <ActivityIndicator color={isPrimary ? '#fff' : '#B42318'} />
      ) : (
        <Text style={isPrimary ? styles.primaryText : styles.dangerOutlineText}>{label}</Text>
      )}
    </Pressable>
  );
}

// =============================================================================
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F5F7' },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', marginVertical: 16 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#111' },
  statLabel: { fontSize: 12, color: '#777', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, color: '#111' },
  label: { fontSize: 12, color: '#777', marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: 15, color: '#111', fontWeight: '600', marginTop: 2 },
  note: { fontSize: 15, color: '#333', fontStyle: 'italic', marginTop: 2 },
  muted: { fontSize: 13, color: '#777' },
  errorTitle: { fontSize: 17, fontWeight: '700', color: '#B42318' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5E5', marginVertical: 10 },
  pointRow: { flexDirection: 'row', gap: 12 },
  pointDot: { width: 12, height: 12, borderRadius: 6, marginTop: 14 },
  timelineRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#999', marginTop: 7 },
  outlineBtn: { marginTop: 14, borderWidth: 1, borderColor: '#111', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  outlineBtnText: { fontWeight: '700', color: '#111' },
  darkBtn: { marginTop: 12, backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  darkBtnText: { color: '#fff', fontWeight: '700' },
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 28, // room for the phone's home indicator
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDD',
  },
  actionBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: { backgroundColor: '#1B7A3D' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dangerOutlineBtn: { borderWidth: 1.5, borderColor: '#B42318', backgroundColor: '#fff' },
  dangerOutlineText: { color: '#B42318', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
