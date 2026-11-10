import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useRouter } from "expo-router";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
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

// ---------- helpers ----------

// Accepts any shape and always returns [{ latitude, longitude }, ...]
function extractPoints(route) {
  if (!route) return [];

  if (Array.isArray(route.routeCoordinates) && route.routeCoordinates.length) {
    return route.routeCoordinates.map((c) =>
      Array.isArray(c) ? { latitude: c[1], longitude: c[0] } : c
    );
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

// Straight-line sum between points (fallback if distance is missing)
function distanceFromPoints(points) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  let total = 0;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dLat = rad(b.latitude - a.latitude);
    const dLng = rad(b.longitude - a.longitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.latitude)) *
        Math.cos(rad(b.latitude)) *
        Math.sin(dLng / 2) ** 2;
    total += 2 * R * Math.asin(Math.sqrt(h));
  }

  return total;
}

// Works out: all routes, the selected route, its index
function parseRoutePayload(payload) {
  const list = Array.isArray(payload)
    ? payload
    : payload.routes ?? payload.alternatives ?? payload.allRoutes ?? [];

  const selected =
    payload.selectedRoute ??
    payload.route ??
    (Array.isArray(payload) ? payload[0] : null) ??
    (list.length ? list[payload.selectedIndex ?? 0] : null) ??
    payload;

  let selectedIndex =
    payload.selectedIndex ?? payload.selectedRouteIndex ?? -1;

  if (selectedIndex < 0 && list.length) {
    selectedIndex = list.findIndex(
      (r) => r === selected || (r?.id != null && r.id === selected?.id)
    );
  }

  if (selectedIndex < 0) selectedIndex = 0;

  return {
    selected,
    selectedIndex,
    alternativesCount: Math.max(list.length - 1, 0),
  };
}

export default function PublishRideScreen() {
  const router = useRouter();
  const { routeData, saveRoute, clearRoute } = useRoute();

  const [origin, setOrigin] = useState("Jaffna");
  const [destination, setDestination] = useState("Vavuniya");

  const [originCoordinates, setOriginCoordinates] = useState({
    latitude: 9.6615,
    longitude: 80.0255,
  });

  const [destinationCoordinates, setDestinationCoordinates] = useState({
    latitude: 8.7514,
    longitude: 80.4971,
  });

  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [timedOut, setTimedOut] = useState(false);

  // Latest values in a ref so handleRouteCalculated never changes identity
  // (a stable callback stops RoutePreview from recalculating in a loop).
  const latest = useRef({});
  latest.current = {
    origin,
    destination,
    originCoordinates,
    destinationCoordinates,
    saveRoute,
  };

  // ---------- derived state (no race conditions) ----------
  const selectedRoute = routeData?.selectedRoute;
  const pointCount = selectedRoute?.routeCoordinates?.length || 0;
  const hasRoute = pointCount > 0;
  const hasEndpoints = !!originCoordinates && !!destinationCoordinates;

  const hasRouteRef = useRef(false);
  hasRouteRef.current = hasRoute;

  // ---------- route received (main route OR alternative picked on map) ----------
  const handleRouteCalculated = useCallback((payload) => {
    if (!payload) return;

    // Shows the real shape RoutePreview sends. Check Metro logs.
    console.log(
      "[PublishRide] RoutePreview returned keys:",
      Array.isArray(payload) ? `array(${payload.length})` : Object.keys(payload)
    );

    const { selected, selectedIndex, alternativesCount } =
      parseRoutePayload(payload);

    const points = extractPoints(selected);
    if (!points.length) {
      console.log("[PublishRide] No route points found in payload");
      return;
    }

    const distanceKm =
      payload.distanceKm ??
      selected.distanceKm ??
      distanceFromPoints(points);

    const durationMinutes =
      payload.durationMinutes ?? selected.durationMinutes ?? null;

    const {
      origin,
      destination,
      originCoordinates,
      destinationCoordinates,
      saveRoute,
    } = latest.current;

    if (!originCoordinates || !destinationCoordinates) return;

    setSuggestedPrice(
      String(Math.round((distanceKm * PRICE_PER_KM) / 50) * 50)
    );

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
        selectedIndex,
        isAlternative: selectedIndex > 0,
        alternativesCount,
      },
      savedAt: new Date().toISOString(),
    });
  }, []);

  // Timeout so the screen never waits forever
  useEffect(() => {
    setTimedOut(false);
    if (!originCoordinates || !destinationCoordinates) return;

    const timer = setTimeout(() => {
      if (!hasRouteRef.current) setTimedOut(true);
    }, ROUTE_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [originCoordinates, destinationCoordinates]);

  function resetRoute() {
    clearRoute();
    setSuggestedPrice("");
    setTimedOut(false);
  }

  // ---------- map picker ----------
  function openMapPicker(type) {
    const isOrigin = type === "origin";

    const setCoords = isOrigin
      ? setOriginCoordinates
      : setDestinationCoordinates;
    const setName = isOrigin ? setOrigin : setDestination;

    setMapPickerSelectionHandler((location) => {
      setCoords({
        latitude: location.latitude,
        longitude: location.longitude,
      });

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

  // ---------- continue (console only, no backend) ----------
  function handleNext() {
    if (!origin.trim() || !destination.trim()) {
      return Alert.alert(
        "Missing location",
        "Choose both pickup and destination."
      );
    }

    if (!originCoordinates || !destinationCoordinates) {
      return Alert.alert(
        "Choose locations on the map",
        "Please select both locations using the map."
      );
    }

    if (
      originCoordinates.latitude === destinationCoordinates.latitude &&
      originCoordinates.longitude === destinationCoordinates.longitude
    ) {
      return Alert.alert("Invalid route", "Choose two different locations.");
    }

    if (!hasRoute) {
      return Alert.alert(
        "Route not ready",
        "Please wait until the route is calculated."
      );
    }

    console.log("========== SAVED RIDE ROUTE ==========");
    console.log("Origin:", JSON.stringify(routeData.origin));
    console.log("Destination:", JSON.stringify(routeData.destination));
    console.log(
      "Chosen:",
      selectedRoute.isAlternative
        ? `Alternative route (#${selectedRoute.selectedIndex})`
        : "Main route"
    );
    console.log("Alternatives available:", selectedRoute.alternativesCount);
    console.log("Distance (km):", selectedRoute.distanceKm);
    console.log("Duration (min):", selectedRoute.durationMinutes);
    console.log("Suggested price (Rs.):", suggestedPrice);
    console.log("Total route points:", pointCount);
    console.log("Saved at:", routeData.savedAt);
    console.log("All route points:");
    console.log(JSON.stringify(selectedRoute.routeCoordinates, null, 2));
    console.log("======================================");

    router.push({
      pathname: "/Rideinfoscreen",
      params: {
        route: JSON.stringify({
          origin: routeData.origin,
          destination: routeData.destination,
        }),
        suggestedPrice,
      },
    });
  }

  // ---------- real progress steps ----------
  const steps = useMemo(() => {
    const routesFound = hasRoute;
    const failed = !hasRoute && timedOut;
    const altCount = selectedRoute?.alternativesCount ?? 0;
    const isAlt = !!selectedRoute?.isAlternative;
    const priceDone = routesFound && !!suggestedPrice;
    const pointsSaved = routesFound && pointCount > 0;

    // Marks the first unfinished step as "active", the rest "pending"
    const done = [
      routesFound,
      routesFound,
      routesFound,
      priceDone,
      pointsSaved,
    ];
    const firstOpen = done.findIndex((d) => !d);

    const statusOf = (i) => {
      if (done[i]) return "done";
      if (failed && i === 0) return "error";
      return i === firstOpen ? "active" : "pending";
    };

    return [
      {
        label: failed ? "Route not found, try again" : "Finding routes",
        status: statusOf(0),
      },
      {
        label: routesFound
          ? altCount > 0
            ? `Main route + ${altCount} alternative${altCount > 1 ? "s" : ""} found`
            : "Main route found (no alternatives)"
          : "Checking alternative routes",
        status: statusOf(1),
      },
      {
        label: routesFound
          ? isAlt
            ? "Alternative route selected on map"
            : "Main route selected on map"
          : "Selecting route on map",
        status: statusOf(2),
      },
      {
        label: "Calculating distance and price",
        status: statusOf(3),
      },
      {
        label: pointsSaved
          ? `Route points saved (${pointCount})`
          : "Saving route points",
        status: statusOf(4),
      },
    ];
  }, [hasRoute, timedOut, selectedRoute, suggestedPrice, pointCount]);

  const busy = !hasRoute;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Header
          onProfilePress={() =>
            Alert.alert("Driver profile", "Profile options")
          }
        />

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

        {hasEndpoints && <RouteProgress steps={steps} />}

        <Text style={styles.priceText}>
          Suggested price: Rs. {suggestedPrice || "Calculating..."}
        </Text>

        <TouchableOpacity
          style={[styles.nextButton, busy && { opacity: 0.5 }]}
          onPress={handleNext}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.nextText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 120,
  },
  title: { fontSize: 25, fontWeight: "800", color: COLORS.secondary },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
    marginBottom: 19,
  },
  priceText: {
    fontSize: 14,
    color: COLORS.secondary,
    fontWeight: "700",
    marginVertical: 10,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  nextText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
});