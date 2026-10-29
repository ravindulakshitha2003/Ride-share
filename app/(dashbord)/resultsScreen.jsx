
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
import { getErrorMessage } from '../../api/client';
import { friendlyDate } from '../../utils/date';
import RideCard from '../../components/rideCard';

export default function ResultsScreen({ route, navigation }) {
  // Read search parameters safely.
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

  // Validate the search before calling the API.
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(new Date(`${date}T00:00:00`).getTime());

  const load = useCallback(async () => {
    if (!from.trim() || !to.trim() || !validDate) {
      setRides([]);
      setError('Please provide a valid starting location, destination, and travel date.');
      return;
    }

    if (from.trim().toLowerCase() === to.trim().toLowerCase()) {
      setRides([]);
      setError('Starting location and destination must be different.');
      return;
    }

    setRides(null);
    setError('');

    try {
      const result = await searchRides({
        from,
        to,
        date,
        passengers,
      });

      // Avoid passing unexpected API response data to FlatList.
      if (!Array.isArray(result)) {
        throw new Error('The server returned an invalid ride list.');
      }

      setRides(result);
    } catch (err) {
      setError(getErrorMessage(err));
      setRides([]);
    }
  }, [from, to, date, passengers, validDate]);

  useEffect(() => {
    load();
  }, [load]);

  const dateLabel = validDate
    ? friendlyDate(new Date(`${date}T00:00:00`))
    : 'Date unavailable';

  const header = (
    <View style={styles.summary}>
      <Text style={styles.route}>
        {from || 'Starting point'} → {to || 'Destination'}
      </Text>

      <Text style={styles.sub}>
        {dateLabel} · {passengers}{' '}
        {passengers === 1 ? 'passenger' : 'passengers'}
      </Text>

      {returnDate ? (
        <Text style={styles.returnText}>
          Return on {friendlyDate(new Date(`${returnDate}T00:00:00`))}.
          You can select your return ride separately.
        </Text>
      ) : null}
    </View>
  );

  // Loading state.
  if (rides === null && !error) {
    return (
      <View style={styles.center}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />
        <Text style={styles.sub}>Looking for rides...</Text>
      </View>
    );
  }

  // Error state.
  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="alert-circle-outline"
          size={42}
          color={colors.error}
        />

        <Text style={styles.error}>{error}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={load}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.page}
      contentContainerStyle={styles.content}
      data={rides}
      keyExtractor={(item, index) =>
        String(item.id ?? item._id ?? `ride-${index}`)
      }
      ListHeaderComponent={header}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons
            name="car-outline"
            size={48}
            color={colors.primary}
          />

          <Text style={styles.emptyTitle}>No rides found</Text>

          <Text style={styles.emptyText}>
            Try another date, route, or fewer passengers.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={load}
          >
            <Text style={styles.buttonText}>Search again</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => (
        <RideCard
          ride={item}
          onPress={() => {
            // This route must exist in your navigation stack.
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
  empty: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text,
    opacity: 0.7,
    marginTop: 6,
    textAlign: 'center',
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginVertical: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});
