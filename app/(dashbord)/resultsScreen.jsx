
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../theme/colors';
import { searchRides } from '../../api/rides';
import { friendlyDate } from '../../utils/date';
import RideCard from '../../components/rideCard';

/* -------------------------------------------------------
   Mock data
------------------------------------------------------- */

// TODO: Remove mock rides when the backend search API is ready.
// These objects follow the existing RideCard ride structure.

const MOCK_RIDES = [
  {
    id: 'mock_ride_001',
    date: '2026-11-05',
    departureTime: '06:30 AM',
    arrivalTime: '12:00 PM',
    from: 'Badulla',
    to: 'Colombo',
    durationMin: 330,
    pricePerSeat: 1800,
    seatsFree: 3,
    driver: {
      name: 'Kasun Perera',
      verified: true,
      rating: 4.8,
      ridesCount: 42,
      vehicle: 'Toyota Axio',
      hasAC: true,
    },
  },
  {
    id: 'mock_ride_002',
    date: '2026-11-05',
    departureTime: '08:00 AM',
    arrivalTime: '02:00 PM',
    from: 'Badulla',
    to: 'Colombo',
    durationMin: 360,
    pricePerSeat: 1500,
    seatsFree: 2,
    driver: {
      name: 'Nimal Fernando',
      verified: true,
      rating: 4.6,
      ridesCount: 28,
      vehicle: 'Honda Fit',
      hasAC: true,
    },
  },
];

// Create mock rides using the current search parameters.
function getMockRides(from, to, date) {
  const validRoute =
    from.trim() &&
    to.trim() &&
    from.trim().toLowerCase() !== to.trim().toLowerCase();

  const mockFrom = validRoute ? from.trim() : 'Badulla';
  const mockTo = validRoute ? to.trim() : 'Colombo';

  const mockDate = date || '2026-11-05';

  return MOCK_RIDES.map((ride) => ({
    ...ride,
    from: mockFrom,
    to: mockTo,
    date: mockDate,
    driver: { ...ride.driver },
  }));
}

/* -------------------------------------------------------
   Results screen
------------------------------------------------------- */

export default function ResultsScreen({ route, navigation }) {
  const params = route?.params ?? {};

  const from = params.from ?? '';
  const to = params.to ?? '';
  const date = params.date ?? '';
  const returnDate = params.returnDate ?? '';

  const passengers = Math.max(
    1,
    Number(params.passengers) || 1
  );

  const [rides, setRides] = useState(null);
  const [error, setError] = useState('');
  const [usingMockData, setUsingMockData] = useState(false);

  // Validate search parameters.
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(new Date(`${date}T00:00:00`).getTime());

  const validRoute =
    from.trim() &&
    to.trim() &&
    from.trim().toLowerCase() !== to.trim().toLowerCase();

  /* -------------------------------------------------------
     Load rides
  ------------------------------------------------------- */

  const load = useCallback(async () => {
    setRides(null);
    setError('');
    setUsingMockData(false);

    // If search parameters are invalid, show sample rides
    // instead of displaying an error screen.
    if (!validRoute || !validDate) {
      setRides(getMockRides(from, to, date));
      setUsingMockData(true);
      return;
    }

    try {
      const result = await searchRides({
        from,
        to,
        date,
        passengers,
      });

      if (!Array.isArray(result)) {
        throw new Error('Invalid ride list received from server.');
      }

      setRides(result);
    } catch (err) {
      console.log(
        'Ride search API unavailable. Showing mock rides:',
        err?.message
      );

      // Backend unavailable: display mock rides.
      setRides(getMockRides(from, to, date));
      setUsingMockData(true);
      setError('');
    }
  }, [from, to, date, passengers, validDate, validRoute]);

  useEffect(() => {
    load();
  }, [load]);

  /* -------------------------------------------------------
     Search summary
  ------------------------------------------------------- */

  const dateLabel = validDate
    ? friendlyDate(new Date(`${date}T00:00:00`))
    : 'Sample travel date';

  const header = (
    <View>
      <View style={styles.summary}>
        <View style={styles.routeRow}>
          <View style={styles.locationIcon}>
            <Ionicons
              name="location-outline"
              size={20}
              color={colors.primary}
            />
          </View>

          <View style={styles.routeContent}>
            <Text style={styles.route}>
              {from || 'Badulla'} → {to || 'Colombo'}
            </Text>

            <Text style={styles.sub}>
              {dateLabel} · {passengers}{' '}
              {passengers === 1 ? 'passenger' : 'passengers'}
            </Text>
          </View>
        </View>

        {returnDate ? (
          <Text style={styles.returnText}>
            Return on {friendlyDate(new Date(`${returnDate}T00:00:00`))}.
            You can select your return ride separately.
          </Text>
        ) : null}
      </View>

      {usingMockData ? (
        <View style={styles.mockNotice}>
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={colors.primary}
          />

          <Text style={styles.mockNoticeText}>
            Showing sample rides. Live search is currently unavailable.
          </Text>
        </View>
      ) : null}

      <Text style={styles.resultsTitle}>
        Available rides
      </Text>

      {rides?.length > 0 ? (
        <Text style={styles.resultsCount}>
          {rides.length} rides found
        </Text>
      ) : null}
    </View>
  );

  /* -------------------------------------------------------
     Loading state
  ------------------------------------------------------- */

  if (rides === null && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.sub}>
          Looking for rides...
        </Text>
      </View>
    );
  }

  /* -------------------------------------------------------
     Results
  ------------------------------------------------------- */

  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      data={rides || []}
      keyExtractor={(item, index) =>
        String(item.id ?? item._id ?? `ride-${index}`)
      }
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="car-outline"
              size={48}
              color={colors.primary}
            />
          </View>

          <Text style={styles.emptyTitle}>
            No rides found
          </Text>

          <Text style={styles.emptyText}>
            There are currently no rides for this route.
            Try another date or destination.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={load}
            accessibilityRole="button"
            accessibilityLabel="Search again"
          >
            <Text style={styles.buttonText}>
              Search again
            </Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => (
        <RideCard
          ride={item}
          onPress={() => {
            navigation.navigate('RideDetails', {
              ride: item,
              passengers,
            });
          }}
        />
      )}
      showsVerticalScrollIndicator={false}
    />
  );
}

/* -------------------------------------------------------
   Styles
------------------------------------------------------- */

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },

  summary: {
    marginBottom: 16,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EEEBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  routeContent: {
    flex: 1,
  },

  route: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
  },

  sub: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.75,
    marginTop: 6,
  },

  returnText: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 10,
  },

  mockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEEBFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },

  mockNoticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.secondary,
    fontWeight: '600',
  },

  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 4,
  },

  resultsCount: {
    fontSize: 13,
    color: colors.text,
    opacity: 0.65,
    marginBottom: 12,
  },

  empty: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 12,
  },

  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EEEBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 16,
  },

  emptyText: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 21,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
