
import React from 'react';
import { useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function TestRequestRide() {
  const router = useRouter();

  const sampleRide = {
    id: 'TEST001',
    pricePerSeat: 2200,
    currency: 'Rs',
    departureAt: '2026-11-25T08:30:00',
    durationMinutes: 180,
    distanceKm: 150,

    driver: {
      name: 'Test Driver',
      rating: 4.8,
      verified: true,
      vehicle: 'Toyota Prius',
    },

    vehicle: {
      brand: 'Toyota',
      model: 'Prius',
      plateNumber: 'ABC-1234',
    },

    searchPickup: {
      name: 'Vavuniya Bus Stand',
    },

    searchDropoff: {
      name: 'Anuradhapura Town',
    },

    suggestedPickup: {
      name: 'Vavuniya Railway Station',
    },

    suggestedDropoff: {
      name: 'Anuradhapura Clock Tower',
    },

    pickupDistanceMeters: 208,
    dropoffDistanceMeters: 350,
  };

  const openRequestScreen = () => {
    router.push({
      pathname: '/(dashbord)/request-ride',
      params: {
        ride: JSON.stringify(sampleRide),
        passengers: '2',
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Request Ride UI Test</Text>

      <Text style={styles.description}>
        This uses temporary sample ride data.
        No login or backend connection is required.
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={openRequestScreen}
      >
        <Text style={styles.buttonText}>
          Open Request to Ride Screen
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 25,
    backgroundColor: '#F5F7FB',
  },
  title: {
    fontSize: 23,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 25,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 17,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
