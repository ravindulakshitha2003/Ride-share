/**
 * publish-ride.jsx
 * ---------------------------------------------------------------------------
 * Step 1 of publishing a ride: choose pickup, destination and a route.
 * The chosen route is saved in RouteContext and the next page (Rideinfoscreen)
 * sends everything to the backend.
 *
 * Look and feel: same as the Add Vehicle page (gradient background, white
 * cards, rounded buttons, icons).
 * Colours:      every colour comes from ../../theme/colors
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons as Icon } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { colors } from "../../theme/colors";
import { useRoute } from "../../context/RouteContext";
import { setMapPickerSelectionHandler } from "../../context/mapNavigation";
import PlaceInput from "../../components/map/PlaceInput";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const TIMEOUT_MS = 30000;
const PRICE_PER_KM = 10;

// ─────────────── Style tokens (same as Add Vehicle) ───────────────

const R = { sm: 12, md: 16, lg: 24, xl: 28, pill: 999 };
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const SHADOW = Platform.select({
  ios: {
    shadowColor: colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 6, shadowColor: colors.primary },
  default: {},
});
const MAX_W = 560;

// How far (px) the Continue button sits above the system navigation bar.
// Increase this number to lift the button higher.
const BOTTOM_LIFT = 70;
const useBottomSpace = () => {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, SP.lg) + BOTTOM_LIFT;
};

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
  const bottomSpace = useBottomSpace();
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
  // The map starts locked so the page scrolls smoothly. Unlock it to zoom or drag the map.
  const [mapUnlocked, setMapUnlocked] = useState(false);

  const requestUrl = useMemo(() => {
    if (!originCoordinates || !destinationCoordinates) return null;
    return (
      `${OSRM_BASE}/${originCoordinates.longitude},${originCoordinates.latitude};` +
      `${destinationCoordinates.longitude},${destinationCoordinates.latitude}` +
      `?alternatives=true&overview=full&geometries=geojson`
    );
  }, [originCoordinates, destinationCoordinates]);

  // Find routes whenever the places change
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
      setErrorText("Pickup and destination are the same. Please choose two different places.");
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
        if (!res.ok) throw new Error(`Route service error ${res.status}`);
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
            points: toMapPoints(r.geometry.coordinates),
            // Raw route values. These are sent to the backend as they are.
            geometry: r.geometry, // GeoJSON LineString [[lng, lat], ...]
            distanceMeters: r.distance,
            durationSeconds: r.duration,
          };
        });

        setRoutes(parsed);
        setSelectedIndex(0);
        setStatus("ready");
      } catch (e) {
        // Cancelled because the places changed: a newer search is already running
        if (e.name === "AbortError" && !timedOut) return;
        console.log("[Route search] Failed:", e.message); // technical detail stays in the log only
        setErrorText(
          timedOut
            ? "This is taking too long. Please check your internet and try again."
            : "We could not find a route between these places. Please try again."
        );
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

  // Put the map back on the route (or on both places if no route yet)
  const resetMap = useCallback(() => {
    const spots = routes.length
      ? routes.flatMap((r) => r.points)
      : [originCoordinates, destinationCoordinates].filter(Boolean);
    if (!spots.length) return;
    mapRef.current?.fitToCoordinates(spots, {
      edgePadding: { top: 50, right: 40, bottom: 50, left: 40 },
      animated: true,
    });
  }, [routes, originCoordinates, destinationCoordinates]);

  // Zoom the map so every route is visible as soon as routes are found
  useEffect(() => {
    if (status !== "ready" || !routes.length) return;
    const t = setTimeout(resetMap, 300);
    return () => clearTimeout(t);
  }, [status, routes, resetMap]);

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
      return Alert.alert("Missing place", "Please choose both pickup and destination.");
    }
    if (!originCoordinates || !destinationCoordinates) {
      return Alert.alert("Choose places from the list", "Please pick both places from the suggestions or on the map.");
    }
    if (status !== "ready" || !selected) {
      return Alert.alert("Route not ready", "Please wait until the route is found.");
    }

    try {
      setSaving(true);

      // Save the chosen route so the next page can use it.
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
      Alert.alert("Could not save the route", "Something went wrong. Please try again.");
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

  return (
    <LinearGradient colors={[colors.background, colors.gradientEnd]} style={styles.flex}>
      <View pointerEvents="none" style={styles.glowA} />
      <View pointerEvents="none" style={styles.glowB} />

      <SafeAreaView edges={["top", "left", "right"]} style={styles.flex}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

        <View style={styles.shell}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* header */}
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={styles.backBtn}
              >
                <Icon name="arrow-left" size={24} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.h1}>
                Choose your route
              </Text>
              <Text style={styles.sub}>Search for places or pick them on the map.</Text>
            </View>

            {/* pickup + destination */}
            <View style={[styles.card, styles.inputsCard]}>
              <PlaceInput
                label="Pickup"
                color={colors.success}
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

              <Pressable
                style={styles.swapBtn}
                onPress={swapLocations}
                accessibilityRole="button"
                accessibilityLabel="Swap pickup and destination"
              >
                <Icon name="swap-vertical" size={22} color={colors.primary} />
              </Pressable>

              <PlaceInput
                label="Destination"
                color={colors.error}
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
              <View style={styles.needed} accessibilityLiveRegion="polite">
                <Icon name="information-outline" size={16} color={colors.textMuted} />
                <Text style={styles.neededText}>
                  Pick a place from the list, or use the pin button, for both places to see routes.
                </Text>
              </View>
            )}

            {/* map */}
            <View style={styles.mapWrap}>
              <MapView
                ref={mapRef}
                style={StyleSheet.absoluteFill}
                initialRegion={{ latitude: 7.5, longitude: 80.7, latitudeDelta: 3, longitudeDelta: 3 }}
                scrollEnabled={mapUnlocked}
                zoomEnabled={mapUnlocked}
                rotateEnabled={mapUnlocked}
                pitchEnabled={mapUnlocked}
                toolbarEnabled={false}
              >
                {originCoordinates && (
                  <Marker coordinate={originCoordinates} title={origin} pinColor={colors.success} />
                )}
                {destinationCoordinates && (
                  <Marker coordinate={destinationCoordinates} title={destination} pinColor={colors.error} />
                )}
                {drawOrder.map((r) => {
                  const isSelected = r.index === selectedIndex;
                  return (
                    <Polyline
                      key={`${r.index}-${isSelected}`}
                      coordinates={r.points}
                      strokeColor={isSelected ? colors.primary : colors.disabledText}
                      strokeWidth={isSelected ? 6 : 4}
                      tappable
                      onPress={() => setSelectedIndex(r.index)}
                      zIndex={isSelected ? 2 : 1}
                    />
                  );
                })}
              </MapView>

              {/* map buttons */}
              <View style={styles.mapButtons}>
                <Pressable
                  onPress={() => setMapUnlocked((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={mapUnlocked ? "Lock map" : "Move map"}
                  style={[styles.mapBtn, mapUnlocked && styles.mapBtnOn]}
                >
                  <Icon
                    name={mapUnlocked ? "lock-outline" : "cursor-move"}
                    size={18}
                    color={mapUnlocked ? colors.white : colors.primary}
                  />
                  <Text style={[styles.mapBtnText, mapUnlocked && { color: colors.white }]}>
                    {mapUnlocked ? "Lock map" : "Move map"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={resetMap}
                  accessibilityRole="button"
                  accessibilityLabel="Reset map to the route"
                  style={[styles.mapBtn, { marginTop: SP.sm }]}
                >
                  <Icon name="crosshairs-gps" size={18} color={colors.primary} />
                  <Text style={styles.mapBtnText}>Reset map</Text>
                </Pressable>
              </View>

              {status === "loading" && (
                <View style={styles.overlay}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.overlayText}>Finding the best routes...</Text>
                </View>
              )}
              {status === "error" && (
                <View style={styles.overlay}>
                  <Icon name="alert-circle-outline" size={28} color={colors.error} />
                  <Text style={styles.errorText}>{errorText}</Text>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => setReloadKey((k) => k + 1)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.retryText}>Try again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <Text style={styles.mapHint}>
              {mapUnlocked
                ? "You can now drag and zoom the map. Tap Lock map to scroll the page again."
                : "The map is locked so the page scrolls easily. Tap Move map to drag or zoom it."}
            </Text>

            {/* summary of the chosen route */}
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
                  <Text style={[styles.statValue, { color: colors.successSoft }]}>
                    Rs. {selected.suggestedPrice}
                  </Text>
                  <Text style={styles.statLabel}>Suggested price</Text>
                </View>
              </View>
            )}

            {/* route choices */}
            {routes.map((r) => {
              const isSelected = r.index === selectedIndex;
              return (
                <Pressable
                  key={r.index}
                  style={[styles.routeCard, isSelected && styles.routeCardOn]}
                  onPress={() => setSelectedIndex(r.index)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={r.isAlternative ? `Alternative route ${r.index}` : "Recommended route"}
                >
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: isSelected ? colors.primary : colors.disabledText },
                    ]}
                  />
                  <View style={styles.flex}>
                    <Text style={styles.routeTitle}>
                      {r.isAlternative ? `Alternative route ${r.index}` : "Recommended route"}
                    </Text>
                    <Text style={styles.routeSub}>
                      {r.distanceKm} km  •  {formatDuration(r.durationMinutes)}
                    </Text>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioOn]}>
                    {isSelected && <Icon name="check" size={16} color={colors.white} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Continue button, lifted above the system navigation bar */}
          <View style={[styles.bottomBar, { paddingBottom: bottomSpace }]}>
            <Pressable
              onPress={handleContinue}
              disabled={!canContinue}
              accessibilityRole="button"
              accessibilityLabel="Continue"
              accessibilityState={{ disabled: !canContinue }}
              style={[styles.btn, !canContinue && { opacity: 0.45 }]}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <View style={styles.row}>
                  <Text style={styles.btnText}>Continue</Text>
                  <Icon name="arrow-right" size={20} color={colors.white} style={{ marginLeft: SP.sm }} />
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─────────────── Styles ───────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  shell: { flex: 1, width: "100%", maxWidth: MAX_W, alignSelf: "center", paddingHorizontal: 20 },
  content: { paddingTop: SP.xs, paddingBottom: SP.xxxl },

  // soft background circles (same as Add Vehicle)
  glowA: {
    position: "absolute",
    top: -80,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.accent,
    opacity: 0.28,
  },
  glowB: {
    position: "absolute",
    bottom: 120,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.primary,
    opacity: 0.1,
  },

  // header
  topBar: { flexDirection: "row", alignItems: "center", height: 56 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW,
  },
  header: { marginTop: SP.lg, marginBottom: SP.xxl },
  h1: { fontSize: 28, lineHeight: 34, fontWeight: "800", color: colors.text, letterSpacing: -0.4 },
  sub: { fontSize: 15, lineHeight: 22, color: colors.textMuted, marginTop: SP.sm },

  // cards
  card: { backgroundColor: colors.surface, borderRadius: R.lg, padding: SP.xl, ...SHADOW },
  inputsCard: { zIndex: 5 }, // keeps the suggestion list above the map
  swapBtn: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.tint,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: SP.xs,
    zIndex: 2,
  },

  // helper text
  needed: { flexDirection: "row", alignItems: "flex-start", marginTop: SP.lg, paddingHorizontal: SP.xs },
  neededText: { flex: 1, marginLeft: SP.sm, fontSize: 13, color: colors.textMuted },

  // map
  mapWrap: {
    height: 290,
    borderRadius: R.lg,
    overflow: "hidden",
    marginTop: SP.lg,
    backgroundColor: colors.tint,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  mapButtons: { position: "absolute", top: SP.md, right: SP.md, alignItems: "flex-end" },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    paddingHorizontal: SP.md,
    borderRadius: R.pill,
    backgroundColor: colors.surface,
    ...SHADOW,
  },
  mapBtnOn: { backgroundColor: colors.primary },
  mapBtnText: { marginLeft: 6, fontSize: 13, fontWeight: "700", color: colors.primary },
  mapHint: { fontSize: 12, lineHeight: 18, color: colors.textMuted, marginTop: SP.sm, paddingHorizontal: SP.xs },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${colors.background}E6`,
    alignItems: "center",
    justifyContent: "center",
    padding: SP.xl,
  },
  overlayText: { marginTop: SP.md, fontSize: 14, fontWeight: "600", color: colors.text },
  errorText: {
    marginTop: SP.sm,
    fontSize: 14,
    lineHeight: 20,
    color: colors.error,
    fontWeight: "700",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: SP.md,
    backgroundColor: colors.text,
    paddingHorizontal: SP.xxl,
    minHeight: 44,
    justifyContent: "center",
    borderRadius: R.md,
  },
  retryText: { color: colors.white, fontWeight: "700", fontSize: 15 },

  // route summary
  summary: {
    flexDirection: "row",
    backgroundColor: colors.text,
    borderRadius: R.lg,
    paddingVertical: SP.lg,
    marginTop: SP.lg,
    ...SHADOW,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "800", color: colors.white },
  statLabel: { fontSize: 12, color: colors.disabledText, marginTop: 3 },
  statDivider: { width: 1, backgroundColor: `${colors.white}33` },

  // route choices
  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: R.lg,
    padding: SP.lg,
    marginTop: SP.md,
    borderWidth: 2,
    borderColor: "transparent",
    ...SHADOW,
  },
  routeCardOn: { backgroundColor: colors.tint, borderColor: colors.primary },
  swatch: { width: 6, height: 38, borderRadius: 3, marginRight: SP.md },
  routeTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  routeSub: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },

  // bottom button (same as Add Vehicle "Next" button)
  bottomBar: { paddingTop: SP.md },
  btn: {
    height: 54,
    borderRadius: R.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  btnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});