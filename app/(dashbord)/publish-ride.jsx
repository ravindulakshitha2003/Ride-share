// ─────────────────────────────────────────────────────────────
// PAGE 1: PublishRideScreen  (file: publish-ride.jsx)
// Only the location + map part: pickup, destination, route preview.
// "Next" validates the route and moves to PublishDetailsScreen.
// ─────────────────────────────────────────────────────────────
import React, { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import {
  Alert,

  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';

import { setMapPickerSelectionHandler } from "../../context/mapNavigation";
import Header from "../../components/map/Header";
import LocationCard from "../../components/map/LocationCard";
import RoutePreview from "../../components/map/route/RoutePreview";
import { COLORS } from "../../theme/mapColors";

const PRICE_PER_KM = 10;

export default function PublishRideScreen() {
  const router = useRouter();

  // ── Route state ──
  const [origin, setOrigin] = useState("Jaffna");
  const [destination, setDestination] = useState("Vavuniya");
  const [originCoordinates, setOriginCoordinates] = useState({ latitude: 9.6615, longitude: 80.0255 });
  const [destinationCoordinates, setDestinationCoordinates] = useState({ latitude: 8.7514, longitude: 80.4971 });
  const [suggestedPrice, setSuggestedPrice] = useState("");

  // Called by RoutePreview once the distance is known.
  const handleRouteCalculated = useCallback(({ distanceKm }) => {
    setSuggestedPrice(String(Math.round((distanceKm * PRICE_PER_KM) / 50) * 50));
  }, []);

  function openMapPicker(type) {
    const isOrigin = type === "origin";
    const setCoords = isOrigin ? setOriginCoordinates : setDestinationCoordinates;
    const setName = isOrigin ? setOrigin : setDestination;

    setMapPickerSelectionHandler((location) => {
      setCoords(location);
      setName(
        location.placeName ||
          `Selected location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
      );
    });

    const initial = isOrigin ? originCoordinates : destinationCoordinates;
    router.push({
      pathname: "/map-picker",
      params: {
        latitude: String(initial?.latitude ?? 9.6615),
        longitude: String(initial?.longitude ?? 80.0255),
        placeName: isOrigin ? origin : destination,
      },
    });
  }

  function swapLocations() {
    setOrigin(destination);
    setDestination(origin);
    setOriginCoordinates(destinationCoordinates);
    setDestinationCoordinates(originCoordinates);
  }

  function handleNext() {
    if (!origin.trim() || !destination.trim()) {
      return Alert.alert("Missing location", "Choose both pickup and destination.");
    }
    if (!originCoordinates || !destinationCoordinates) {
      return Alert.alert(
        "Choose locations on the map",
        "Please select both pickup and destination using the map buttons."
      );
    }
    const same =
      originCoordinates.latitude === destinationCoordinates.latitude &&
      originCoordinates.longitude === destinationCoordinates.longitude;
    if (same) return Alert.alert("Invalid route", "Choose two different locations.");

    // Route params must be strings, so the route is sent as JSON.
    router.push({
      pathname: "/Rideinfoscreen",
      params: {
        route: JSON.stringify({
          origin: { placeName: origin.trim(), ...originCoordinates },
          destination: { placeName: destination.trim(), ...destinationCoordinates },
        }),
        suggestedPrice,
      },
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Header onProfilePress={() => Alert.alert("Driver profile", "Profile options")} />

        <Text style={styles.title}>Publish a ride</Text>
        <Text style={styles.subtitle}>Choose your route</Text>

        <LocationCard
          origin={origin}
          setOrigin={(v) => { setOrigin(v); setOriginCoordinates(null); }}
          destination={destination}
          setDestination={(v) => { setDestination(v); setDestinationCoordinates(null); }}
          onPickOrigin={() => openMapPicker("origin")}
          onPickDestination={() => openMapPicker("destination")}
          onSwap={swapLocations}
        />

        <RoutePreview
          origin={origin}
          destination={destination}
          originCoordinates={originCoordinates}
          destinationCoordinates={destinationCoordinates}
          onRouteCalculated={handleRouteCalculated}
        />

        {/* TODO: swap for <NextButton /> component later */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} accessibilityRole="button">
          <Text style={styles.nextText}>Publish ride</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 15, paddingBottom: 120 },
  title: { fontSize: 25, fontWeight: "800", color: COLORS.secondary },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 4, marginBottom: 19 },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  nextText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});