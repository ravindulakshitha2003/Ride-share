// =============================================================================
// D1 - INCOMING REQUESTS SCREEN   (Expo Router route: /booking)
//
// What it does:
//   - loads the driver's PENDING booking requests from the booking service
//   - pull down to refresh
//   - automatically re-checks every 10 s WHILE this screen is visible
//   - tap a card -> open D2 (route /booking-details) for that booking
//   - shows loading, empty and error states
//
// Why polling? It is the simplest reliable way to see new requests. Later you
// can add push notifications (the Notification Service already receives
// booking.created from RabbitMQ) and keep polling as a backup.
// =============================================================================

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';

import RequestCard from '../../components/booking/RequestCard';
import { getIncomingRequests } from '../../api/bookingApi';
import { REQUESTS_POLL_INTERVAL_MS } from '../../config/bookingConfig';

export default function BookingRequestsScreen() {
  const router = useRouter();
  const navigation = useNavigation();

  // Show a title bar with a back arrow for this screen.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true, title: 'Ride Requests' });
  }, [navigation]);

  // ---- State ---------------------------------------------------------------
  const [requests, setRequests] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true); // big spinner on first load
  const [refreshing, setRefreshing] = useState(false); // pull-to-refresh spinner
  const [error, setError] = useState(null);

  // useRef keeps a value between renders WITHOUT causing a re-render.
  // Used to avoid starting a second request while one is still running.
  const isFetching = useRef(false);

  // ---- Load data -------------------------------------------------------------
  // useCallback keeps the same function between renders, so useFocusEffect
  // below does not restart the timer on every render.
  const loadRequests = useCallback(async ({ silent = false } = {}) => {
    if (isFetching.current) return;
    isFetching.current = true;
    if (!silent) setRefreshing(true);

    try {
      const data = await getIncomingRequests({ status: 'PENDING' });
      setRequests(data);
      setError(null);
    } catch (err) {
      // During silent background polls, keep showing the old list and only
      // show the error if we have nothing to display.
      setError(err.message);
    } finally {
      isFetching.current = false;
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ---- Load when screen is focused + poll while focused -------------------
  // useFocusEffect runs when the screen comes into view (also when the driver
  // comes BACK from D2 after accepting/rejecting -> the list updates itself).
  // The function it returns runs when the screen loses focus -> stop polling,
  // so we don't waste battery/data in the background.
  useFocusEffect(
    useCallback(() => {
      loadRequests({ silent: true });
      const timer = setInterval(() => loadRequests({ silent: true }), REQUESTS_POLL_INTERVAL_MS);
      return () => clearInterval(timer);
    }, [loadRequests]),
  );

  // ---- Render ----------------------------------------------------------------
  if (initialLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Loading requests...</Text>
      </View>
    );
  }

  if (error && requests.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load requests</Text>
        <Text style={styles.muted}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={() => loadRequests()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      // FlatList only renders the rows on screen -> fast even with many items.
      data={requests}
      keyExtractor={(item) => item.bookingId}
      renderItem={({ item }) => (
        <RequestCard
          request={item}
          onPress={() =>
            router.push({ pathname: '/booking-details', params: { bookingId: item.bookingId } })
          }
        />
      )}
      contentContainerStyle={requests.length === 0 ? styles.emptyContainer : styles.listContainer}
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRequests()} />}
      ListHeaderComponent={
        requests.length > 0 ? (
          <Text style={styles.header}>
            {requests.length} pending request{requests.length > 1 ? 's' : ''}
          </Text>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No new requests</Text>
          <Text style={styles.muted}>New ride requests will appear here. Pull down to refresh.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F4F5F7' },
  listContainer: { paddingVertical: 12 },
  emptyContainer: { flexGrow: 1 },
  header: { fontSize: 13, color: '#666', marginHorizontal: 16, marginBottom: 8, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  muted: { color: '#777', textAlign: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  errorTitle: { fontSize: 17, fontWeight: '700', color: '#B42318' },
  retryBtn: { marginTop: 12, backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#fff', fontWeight: '700' },
});
