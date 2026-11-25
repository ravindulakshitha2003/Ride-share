// PAGE 1: PublishRideScreen (file: publish-ride.jsx)
// OSRM route picker (map, alternatives, selection)
// -> selected route geometry + distance + duration saved in RouteContext
// -> Rideinfoscreen (page 2) sends everything to the backend.
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useRoute } from "../../context/RouteContext";
import { setMapPickerSelectionHandler } from "../../context/mapNavigation";
import PlaceInput from "../../components/map/PlaceInput";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const TIMEOUT_MS = 30000;
const PRICE_PER_KM = 10;

// Palette
const INK = "#12263A";
const MUTED = "#6B7B8C";
const BG = "#F3F6F9";
const LINE = "#E3E9EF";
const BLUE = "#5B4BDB";
const GREEN = "#1F9D63";
const RED = "#D64545";
const ALT = "#9AA7B4";
const MBLUE = "#1F6FEB";

// ─────────────── Helpers ───────────────

const toMapPoints = (coords) =>
  coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));

function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// ─────────────── Screen ───────────────

export default function PublishRideScreen() {
  const router = useRouter();
  const mapRef = useRef(null);
  const { saveRoute, clearRoute } = useRoute();

  // ---------- locations ----------
  const [origin, setOrigin] = useState("Badulla");
  const [destination, setDestination] = useState("Colombo");
  const [originCoordinates, setOriginCoordinates] = useState({
    latitude: 6.9934,
    longitude: 81.055,
  });
  const [destinationCoordinates, setDestinationCoordinates] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
  });

  // ---------- routes ----------
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [errorText, setErrorText] = useState("");
  const [routes, setRoutes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const requestUrl = useMemo(() => {
    if (!originCoordinates || !destinationCoordinates) return null;
    return (
      `${OSRM_BASE}/${originCoordinates.longitude},${originCoordinates.latitude};` +
      `${destinationCoordinates.longitude},${destinationCoordinates.latitude}` +
      `?alternatives=true&overview=full&geometries=geojson`
    );
  }, [originCoordinates, destinationCoordinates]);

  // Fetch routes whenever the locations change
  useEffect(() => {
    setRoutes([]);
    setSelectedIndex(0);
    setErrorText("");
    clearRoute(); // previously saved route is no longer valid

    if (!requestUrl) {
      setStatus("idle");
      return;
    }

    if (
      originCoordinates.latitude === destinationCoordinates.latitude &&
      originCoordinates.longitude === destinationCoordinates.longitude
    ) {
      setStatus("error");
      setErrorText("Choose two different locations.");
      return;
    }

    setStatus("loading");
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, TIMEOUT_MS);

    (async () => {
      try {
        const res = await fetch(requestUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`OSRM HTTP error ${res.status}`);
        const data = await res.json();

        if (data.code !== "Ok" || !data.routes?.length) {
          throw new Error(data.message || `No route found (${data.code})`);
        }

        const parsed = data.routes.map((r, i) => {
          const km = r.distance / 1000;
          return {
            index: i,
            isAlternative: i > 0,
            distanceKm: Number(km.toFixed(1)),
            durationMinutes: Math.round(r.duration / 60),
            suggestedPrice: Math.round((km * PRICE_PER_KM) / 50) * 50,
            pointCount: r.geometry.coordinates.length,
            points: toMapPoints(r.geometry.coordinates),
            // Raw OSRM values. These are sent to the backend as-is.
            geometry: r.geometry, // GeoJSON LineString [[lng, lat], ...]
            distanceMeters: r.distance,
            durationSeconds: r.duration,
          };
        });

        setRoutes(parsed);
        setSelectedIndex(0);
        setStatus("ready");
      } catch (e) {
        // Aborted because the locations changed: a newer request is running
        if (e.name === "AbortError" && !timedOut) return;
        const msg = timedOut ? "Request timed out. Try again." : e.message;
        console.log("[OSRM] Failed:", msg);
        setErrorText(msg);
        setStatus("error");
      } finally {
        clearTimeout(timer);
      }
    })();

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [requestUrl, reloadKey, clearRoute]);

  // Fit the map to all routes
  useEffect(() => {
    if (status !== "ready" || !routes.length) return;
    const all = routes.flatMap((r) => r.points);
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(all, {
        edgePadding: { top: 50, right: 40, bottom: 50, left: 40 },
        animated: true,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [status, routes]);

  // ---------- handlers ----------
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
    });

    const initial = isOrigin ? originCoordinates : destinationCoordinates;
    router.push({
      pathname: "/map-picker",
      params: {
        latitude: String(initial?.latitude ?? 6.9934),
        longitude: String(initial?.longitude ?? 81.055),
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

  function handleContinue() {
    if (saving) return;

    if (!origin.trim() || !destination.trim()) {
      return Alert.alert("Missing location", "Choose both pickup and destination.");
    }
    if (!originCoordinates || !destinationCoordinates) {
      return Alert.alert("Choose locations on the map", "Please select both locations.");
    }
    if (status !== "ready" || !selected) {
      return Alert.alert("Route not ready", "Please wait until the route is calculated.");
    }

    try {
      setSaving(true);

      // Save the selected route (all points) in context for page 2.
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
        geometry: selected.geometry,
        distanceMeters: selected.distanceMeters,
        durationSeconds: selected.durationSeconds,
        distanceKm: selected.distanceKm,
        durationMinutes: selected.durationMinutes,
        savedAt: new Date().toISOString(),
      });

      router.push({
        pathname: "/Rideinfoscreen",
        params: { suggestedPrice: String(selected.suggestedPrice) },
      });
    } catch (e) {
      console.error("Save route error:", e);
      Alert.alert("Could not save route", e.message || "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ---------- derived ----------
  const drawOrder = useMemo(
    () => [...routes].sort((a, b) => (a.index === selectedIndex) - (b.index === selectedIndex)),
    [routes, selectedIndex]
  );
  const selected = routes[selectedIndex];
  const bothPicked = !!originCoordinates && !!destinationCoordinates;
  const canContinue = status === "ready" && !saving;

  const steps = [
    { label: "Both places selected", done: bothPicked, active: false },
    { label: "Getting routes from OSRM", done: status === "ready", active: status === "loading" },
    {
      label:
        status === "ready"
          ? routes.length > 1
            ? `Recommended route + ${routes.length - 1} alternative`
            : "Recommended route (no alternative available)"
          : "Looking for alternatives",
      done: status === "ready",
      active: false,
    },
    {
      label: status === "ready" ? `${selected?.pointCount} route points ready` : "Reading route points",
      done: status === "ready",
      active: false,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Choose your route</Text>
            <Text style={styles.subtitle}>Search places or pick them on the map</Text>
          </View>
        </View>

        {/* inputs */}
        <View style={styles.inputsCard}>
          <PlaceInput
            label="Pickup"
            color={GREEN}
            value={origin}
            hasCoords={!!originCoordinates}
            onChangeText={(t) => {
              setOrigin(t);
              setOriginCoordinates(null);
            }}
            onSelect={(p) => {
              setOrigin(p.name);
              setOriginCoordinates({ latitude: p.latitude, longitude: p.longitude });
            }}
            onPickMap={() => openMapPicker("origin")}
          />

          <TouchableOpacity style={styles.swapBtn} onPress={swapLocations} accessibilityLabel="Swap places">
            <Text style={styles.swapText}>⇅</Text>
          </TouchableOpacity>

          <PlaceInput
            label="Destination"
            color={RED}
            value={destination}
            hasCoords={!!destinationCoordinates}
            onChangeText={(t) => {
              setDestination(t);
              setDestinationCoordinates(null);
            }}
            onSelect={(p) => {
              setDestination(p.name);
              setDestinationCoordinates({ latitude: p.latitude, longitude: p.longitude });
            }}
            onPickMap={() => openMapPicker("destination")}
          />
        </View>

        {!bothPicked && (
          <Text style={styles.warn}>
            Choose a suggestion (or use the pin button) for both places to see routes.
          </Text>
        )}

        {/* map */}
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: 7.5, longitude: 80.7, latitudeDelta: 3, longitudeDelta: 3 }}
          >
            {originCoordinates && (
              <Marker coordinate={originCoordinates} title={origin} pinColor="green" />
            )}
            {destinationCoordinates && (
              <Marker coordinate={destinationCoordinates} title={destination} pinColor="red" />
            )}
            {drawOrder.map((r) => {
              const isSelected = r.index === selectedIndex;
              return (
                <Polyline
                  key={`${r.index}-${isSelected}`}
                  coordinates={r.points}
                  strokeColor={isSelected ? MBLUE : ALT}
                  strokeWidth={isSelected ? 6 : 4}
                  tappable
                  onPress={() => setSelectedIndex(r.index)}
                  zIndex={isSelected ? 2 : 1}
                />
              );
            })}
          </MapView>

          {status === "loading" && (
            <View style={styles.overlay}>
              <ActivityIndicator size="large" color={BLUE} />
              <Text style={styles.overlayText}>Finding the best routes...</Text>
            </View>
          )}
          {status === "error" && (
            <View style={styles.overlay}>
              <Text style={styles.errorText}>{errorText}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => setReloadKey((k) => k + 1)}>
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* selected route summary */}
        {status === "ready" && selected && (
          <View style={styles.summary}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{selected.distanceKm} km</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{formatDuration(selected.durationMinutes)}</Text>
              <Text style={styles.statLabel}>Drive time</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: GREEN }]}>Rs. {selected.suggestedPrice}</Text>
              <Text style={styles.statLabel}>Suggested price</Text>
            </View>
          </View>
        )}

        {/* route cards */}
        {routes.map((r) => {
          const isSelected = r.index === selectedIndex;
          return (
            <TouchableOpacity
              key={r.index}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelectedIndex(r.index)}
              activeOpacity={0.85}
            >
              <View style={[styles.swatch, { backgroundColor: isSelected ? BLUE : ALT }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {r.isAlternative ? `Alternative route ${r.index}` : "Recommended route"}
                </Text>
                <Text style={styles.cardSub}>
                  {r.distanceKm} km · {formatDuration(r.durationMinutes)} · {r.pointCount} points
                </Text>
              </View>
              <View style={[styles.radio, isSelected && styles.radioOn]}>
                {isSelected && <Text style={styles.radioTick}>✓</Text>}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* progress */}
        {bothPicked && (
          <View style={styles.stepsCard}>
            {steps.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepIcon}>
                  {s.active ? (
                    <ActivityIndicator size="small" color={BLUE} />
                  ) : (
                    <Text
                      style={[
                        styles.stepMark,
                        s.done && { color: GREEN },
                        status === "error" && !s.done && { color: RED },
                      ]}
                    >
                      {s.done ? "✓" : status === "error" ? "✕" : "○"}
                    </Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, !s.done && !s.active && { opacity: 0.5 }]}>
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.saveBtn, !canContinue && { opacity: 0.4 }]}
          onPress={handleContinue}
          disabled={!canContinue}
          accessibilityRole="button"
        >
          <Text style={styles.saveText}>{saving ? "Saving..." : "Continue"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 80 },

  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  backText: { fontSize: 26, color: INK, marginTop: -3 },
  title: { fontSize: 24, fontWeight: "800", color: INK },
  subtitle: { fontSize: 13, color: MUTED, marginTop: 2 },

  inputsCard: { zIndex: 5 },
  swapBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    marginVertical: -8,
    zIndex: 2,
    borderWidth: 3,
    borderColor: BG,
  },
  swapText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  warn: { fontSize: 12, color: RED, fontWeight: "600", marginTop: 10 },

  mapWrap: {
    height: 290,
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 14,
    backgroundColor: "#E6ECF1",
    borderWidth: 1,
    borderColor: LINE,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(243,246,249,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  overlayText: { marginTop: 10, fontSize: 13, fontWeight: "600", color: INK },
  errorText: { fontSize: 14, color: RED, fontWeight: "700", textAlign: "center" },
  retryBtn: {
    marginTop: 12,
    backgroundColor: INK,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: { color: "#fff", fontWeight: "700" },

  summary: {
    flexDirection: "row",
    backgroundColor: INK,
    borderRadius: 18,
    paddingVertical: 16,
    marginTop: 14,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "800", color: "#fff" },
  statLabel: { fontSize: 11, color: "#9FB0C0", marginTop: 3 },
  statDivider: { width: 1, backgroundColor: "#2C4259" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: { borderColor: BLUE },
  swatch: { width: 6, height: 38, borderRadius: 3, marginRight: 12 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: INK },
  cardSub: { fontSize: 12, color: MUTED, marginTop: 3 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: BLUE, borderColor: BLUE },
  radioTick: { color: "#fff", fontSize: 13, fontWeight: "800" },

  stepsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginTop: 14 },
  stepRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  stepIcon: { width: 26, alignItems: "center" },
  stepMark: { fontSize: 15, fontWeight: "700", color: "#9AA7B4" },
  stepLabel: { fontSize: 13, fontWeight: "600", marginLeft: 6, color: INK },

  saveBtn: {
    backgroundColor: BLUE,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 18,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});