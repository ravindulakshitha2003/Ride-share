import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "expo-router";
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useRoute } from "../../context/RouteContext";
import { setMapPickerSelectionHandler } from "../../context/mapNavigation";

import Header from "../../components/map/Header";
import LocationCard from "../../components/map/LocationCard";
import RoutePreview from "../../components/map/route/RoutePreview";
import RouteProgress from "../../components/map/RouteProgress";
import { COLORS } from "../../theme/mapColors";

const PRICE_PER_KM = 10;
const ROUTE_TIMEOUT_MS = 20000;

// Accept any of the shapes your RoutePreview might return and
// always produce [{ latitude, longitude }, ...]
function extractPoints(route) {
  if (!route) return [];
  if (Array.isArray(route.routeCoordinates) && route.routeCoordinates.length) {
    return route.routeCoordinates;
  }
  if (Array.isArray(route.coordinates) && route.coordinates.length) {
    return route.coordinates.map((c) =>
      Array.isArray(c) ? { latitude: c[1], longitude: c[0] } : c
    );
  }
  const geo = route.geometry?.coordinates;
  if (Array.isArray(geo) && geo.length) {
    return geo.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  }
  return [];
}

// TODO: replace with your real endpoint
async function saveRouteToBackend(payload) {
  const res = await fetch("https://YOUR_API/rides/route", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Server error ${res.status}`);
  return res.json();
}

export default function PublishRideScreen() {
  const router = useRouter();
  const { routeData, saveRoute, clearRoute } = useRoute();

  const [origin, setOrigin] = useState("Jaffna");
  const [destination, setDestination] = useState("Vavuniya");
  const [originCoordinates, setOriginCoordinates] = useState({ latitude: 9.6615, longitude: 80.0255 });
  const [destinationCoordinates, setDestinationCoordinates] = useState({ latitude: 8.7514, longitude: 80.4971 });
  const [suggestedPrice, setSuggestedPrice] = useState("");

  // "idle" | "calculating" | "ready" | "error"
  const [phase, setPhase] = useState("calculating");
  // "idle" | "saving" | "saved" | "error"
  const [uploadPhase, setUploadPhase] = useState("idle");

  // Keep latest values in a ref so the callback below never changes identity.
  // A stable callback is what stops RoutePreview from recalculating in a loop.
  const latest = useRef({});
  latest.current = { origin, destination, originCoordinates, destinationCoordinates, saveRoute };

  const handleRouteCalculated = useCallback((calculated) => {
    // Ignore "clearing" calls. Calling clearRoute() here causes a render loop.
    if (!calculated) return;

    const selected = calculated.selectedRoute ?? calculated;
    const points = extractPoints(selected);
    const distanceKm = calculated.distanceKm ?? selected.distanceKm;
    const durationMinutes = calculated.durationMinutes ?? selected.durationMinutes;

    if (!points.length || !Number.isFinite(distanceKm)) return;

    const { origin, destination, originCoordinates, destinationCoordinates, saveRoute } = latest.current;
    if (!originCoordinates || !destinationCoordinates) return;

    setSuggestedPrice(String(Math.round((distanceKm * PRICE_PER_KM) / 50) * 50));

    saveRoute({
      origin: {
        placeName: origin.trim(),
        latitude: Number(originCoordinates.latitude),
        longitude: Number(originCoordinates.longitude),
      },
      destination: {
        placeName: destination.trim(),
        latitude: Number(destinationCoordinates.latitude),
        longitude: Number(destinationCoordinates.longitude),
      },
      selectedRoute: {
        ...selected,
        distanceKm,
        durationMinutes,
        routeCoordinates: points, // normalized, always present
      },
      savedAt: new Date().toISOString(),
    });

    setPhase("ready");
  }, []);

  // Whenever the endpoints change, restart the calculating phase with a timeout
  // so the screen can never wait forever.
  useEffect(() => {
    if (!originCoordinates || !destinationCoordinates) {
      setPhase("idle");
      return;
    }
    setPhase("calculating");
    const t = setTimeout(() => {
      setPhase((p) => (p === "calculating" ? "error" : p));
    }, ROUTE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [originCoordinates, destinationCoordinates]);

  function resetRoute() {
    clearRoute();
    setSuggestedPrice("");
    setUploadPhase("idle");
  }

  function openMapPicker(type) {
    const isOrigin = type === "origin";
    const setCoords = isOrigin ? setOriginCoordinates : setDestinationCoordinates;
    const setName = isOrigin ? setOrigin : setDestination;

    setMapPickerSelectionHandler((location) => {
      setCoords({ latitude: location.latitude, longitude: location.longitude });
      setName(
        location.placeName ||
          `Selected location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
      );
      resetRoute();
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
    resetRoute();
  }

  async function handleNext() {
    if (!origin.trim() || !destination.trim()) {
      return Alert.alert("Missing location", "Choose both pickup and destination.");
    }
    if (!originCoordinates || !destinationCoordinates) {
      return Alert.alert("Choose locations on the map", "Please select both locations using the map.");
    }
    if (
      originCoordinates.latitude === destinationCoordinates.latitude &&
      originCoordinates.longitude === destinationCoordinates.longitude
    ) {
      return Alert.alert("Invalid route", "Choose two different locations.");
    }

    const savedRoute = routeData?.selectedRoute;
    if (phase !== "ready" || !savedRoute?.routeCoordinates?.length) {
      return Alert.alert("Route not ready", "Please wait until the route is calculated.");
    }

    // Save every point of the chosen route to the backend.
    try {
      setUploadPhase("saving");
      await saveRouteToBackend({
        origin: routeData.origin,
        destination: routeData.destination,
        distanceKm: savedRoute.distanceKm,
        durationMinutes: savedRoute.durationMinutes,
        suggestedPrice: Number(suggestedPrice),
        points: savedRoute.routeCoordinates,
      });
      setUploadPhase("saved");
    } catch (e) {
      setUploadPhase("error");
      return Alert.alert("Could not save route", e.message || "Please try again.");
    }

    router.push({
      pathname: "/Rideinfoscreen",
      params: {
        route: JSON.stringify({ origin: routeData.origin, destination: routeData.destination }),
        suggestedPrice,
      },
    });
  }

  // Real progress derived from actual state
  const steps = useMemo(() => {
    const routeDone = phase === "ready";
    const priceDone = routeDone && !!suggestedPrice;
    return [
      {
        label: phase === "error" ? "Route not found, try again" : "Finding best route",
        status: routeDone ? "done" : phase === "error" ? "error" : "active",
      },
      {
        label: "Calculating distance and price",
        status: priceDone ? "done" : routeDone ? "active" : "pending",
      },
      {
        label: `Saving route points${
          routeData?.selectedRoute?.routeCoordinates
            ? ` (${routeData.selectedRoute.routeCoordinates.length})`
            : ""
        }`,
        status:
          uploadPhase === "saved" ? "done"
          : uploadPhase === "saving" ? "active"
          : uploadPhase === "error" ? "error"
          : "pending",
      },
    ];
  }, [phase, suggestedPrice, uploadPhase, routeData]);

  const busy = phase !== "ready" || uploadPhase === "saving";

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
          setOrigin={(value) => {
            setOrigin(value);
            setOriginCoordinates(null);
            resetRoute();
          }}
          destination={destination}
          setDestination={(value) => {
            setDestination(value);
            setDestinationCoordinates(null);
            resetRoute();
          }}
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

        <RouteProgress steps={steps} />

        <Text style={styles.priceText}>
          Suggested price: Rs. {suggestedPrice || "Calculating..."}
        </Text>

        <TouchableOpacity
          style={[styles.nextButton, busy && { opacity: 0.5 }]}
          onPress={handleNext}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.nextText}>
            {uploadPhase === "saving" ? "Saving..." : "Continue"}
          </Text>
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
  priceText: { fontSize: 14, color: COLORS.secondary, fontWeight: "700", marginVertical: 10 },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  nextText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});