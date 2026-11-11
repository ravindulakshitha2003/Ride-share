// PAGE 1: PublishRideScreen (file: publish-ride.jsx)
// Pick route -> build SHA-256 route signature -> keep it in RouteContext -> go to page 2.
import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "expo-router";
import { Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";

import { useRoute } from "../../context/RouteContext";
import { setMapPickerSelectionHandler } from "../../context/mapNavigation";

import Header from "../../components/map/Header";
import LocationCard from "../../components/map/LocationCard";
import RoutePreview from "../../components/map/route/RoutePreview";
import RouteProgress from "../../components/map/RouteProgress";
import { COLORS } from "../../theme/mapColors";

const PRICE_PER_KM = 10;
const ROUTE_TIMEOUT_MS = 20000;
const ROUTING_PROFILE = "driving";

// ─────────────── Helpers ───────────────

// Accept any shape RoutePreview returns and always produce [{ latitude, longitude }, ...]
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

// Standard polyline encoding (precision 5)
function encodePolyline(points) {
  let lastLat = 0;
  let lastLng = 0;
  let out = "";

  const enc = (v) => {
    v = v < 0 ? ~(v << 1) : v << 1;
    let s = "";
    while (v >= 0x20) {
      s += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
      v >>= 5;
    }
    return s + String.fromCharCode(v + 63);
  };

  for (const p of points) {
    const lat = Math.round(p.latitude * 1e5);
    const lng = Math.round(p.longitude * 1e5);
    out += enc(lat - lastLat) + enc(lng - lastLng);
    lastLat = lat;
    lastLng = lng;
  }
  return out;
}

// SHA-256 over: origin + destination + encoded geometry + distance + duration + profile
async function createRouteHash({ origin, destination, points, distanceKm, durationMinutes, profile }) {
  const c = (p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;
  const canonical = [
    `o:${c(origin)}`,
    `d:${c(destination)}`,
    `g:${encodePolyline(points)}`,
    `km:${distanceKm.toFixed(2)}`,
    `min:${Number.isFinite(durationMinutes) ? Math.round(durationMinutes) : 0}`,
    `p:${profile}`,
  ].join("|");

  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, canonical);
}

// ─────────────── Screen ───────────────

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

  // Latest values in a ref so handleRouteCalculated never changes identity
  // (a stable callback stops RoutePreview from recalculating in a loop).
  const latest = useRef({});
  latest.current = { origin, destination, originCoordinates, destinationCoordinates, saveRoute };

  // Drops stale async hash results when the route changes mid-calculation.
  const hashJob = useRef(0);

  const handleRouteCalculated = useCallback(async (calculated) => {
    // Ignore "clearing" calls. Calling clearRoute() here causes a render loop.
    if (!calculated) return;

    const selected = calculated.selectedRoute ?? calculated;
    const points = extractPoints(selected);
    const distanceKm = calculated.distanceKm ?? selected.distanceKm;
    const durationMinutes = calculated.durationMinutes ?? selected.durationMinutes;

    if (!points.length || !Number.isFinite(distanceKm)) return;

    const { origin, destination, originCoordinates, destinationCoordinates, saveRoute } = latest.current;
    if (!originCoordinates || !destinationCoordinates) return;

    const o = {
      latitude: Number(originCoordinates.latitude),
      longitude: Number(originCoordinates.longitude),
    };
    const d = {
      latitude: Number(destinationCoordinates.latitude),
      longitude: Number(destinationCoordinates.longitude),
    };

    const job = ++hashJob.current;
    const routeHash = await createRouteHash({
      origin: o,
      destination: d,
      points,
      distanceKm,
      durationMinutes,
      profile: ROUTING_PROFILE,
    });
    if (job !== hashJob.current) return; // endpoints changed while hashing

    setSuggestedPrice(String(Math.round((distanceKm * PRICE_PER_KM) / 50) * 50));

    // Only the signature + summary go into context. No points.
    saveRoute({
      origin: { placeName: origin.trim(), ...o },
      destination: { placeName: destination.trim(), ...d },
      distanceKm,
      durationMinutes,
      profile: ROUTING_PROFILE,
      routeHash,
      savedAt: new Date().toISOString(),
    });

    setPhase("ready");
  }, []);

  // Restart the calculating phase whenever the endpoints change, with a timeout
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
    hashJob.current++;
    clearRoute();
    setSuggestedPrice("");
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

  function handleNext() {
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
    if (phase !== "ready" || !routeData?.routeHash) {
      return Alert.alert("Route not ready", "Please wait until the route is calculated.");
    }

    // Page 2 reads the route from RouteContext.
    router.push({ pathname: "/Rideinfoscreen", params: { suggestedPrice } });
  }

  // Real progress derived from actual state
  const steps = useMemo(() => {
    const routeDone = phase === "ready";
    const priceDone = routeDone && !!suggestedPrice;
    const hash = routeData?.routeHash;
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
        label: hash ? `Route signature ready (${hash.slice(0, 8)}…)` : "Creating route signature",
        status: hash ? "done" : routeDone ? "active" : "pending",
      },
    ];
  }, [phase, suggestedPrice, routeData]);

  const busy = phase !== "ready";

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
          <Text style={styles.nextText}>Continue</Text>
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