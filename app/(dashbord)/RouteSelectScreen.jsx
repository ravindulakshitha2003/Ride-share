import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const TIMEOUT_MS = 20000;
const PRICE_PER_KM = 10;

const SELECTED_COLOR = "#1A73E8";
const ALT_COLOR = "#9AA0A6";

// Defaults so the page works on its own (Jaffna -> Vavuniya)
const DEFAULTS = {
  originName: "Jaffna",
  originLat: "9.6615",
  originLng: "80.0255",
  destinationName: "Vavuniya",
  destinationLat: "8.7514",
  destinationLng: "80.4971",
};

// OSRM geometry is GeoJSON [lng, lat] -> map needs { latitude, longitude }
function toPoints(geojsonCoords) {
  return geojsonCoords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

export default function RouteSelectScreen() {
  const router = useRouter();
  const params = { ...DEFAULTS, ...useLocalSearchParams() };

  const origin = useMemo(
    () => ({
      placeName: params.originName,
      latitude: Number(params.originLat),
      longitude: Number(params.originLng),
    }),
    [params.originName, params.originLat, params.originLng]
  );

  const destination = useMemo(
    () => ({
      placeName: params.destinationName,
      latitude: Number(params.destinationLat),
      longitude: Number(params.destinationLng),
    }),
    [params.destinationName, params.destinationLat, params.destinationLng]
  );

  const mapRef = useRef(null);

  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errorText, setErrorText] = useState("");
  const [routes, setRoutes] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // ---------- call OSRM ----------
  const fetchRoutes = useCallback(async () => {
    setStatus("loading");
    setErrorText("");
    setRoutes([]);
    setSelectedIndex(0);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    // OSRM wants lng,lat order
    const url =
      `${OSRM_URL}/${origin.longitude},${origin.latitude};` +
      `${destination.longitude},${destination.latitude}` +
      `?alternatives=true&overview=full&geometries=geojson&steps=false`;

    try {
      console.log("[OSRM] Request:", url);

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`OSRM error ${res.status}`);

      const data = await res.json();

      console.log("========== OSRM RAW RESPONSE ==========");
      console.log(JSON.stringify(data));

      if (data.code !== "Ok" || !data.routes?.length) {
        throw new Error(data.message || `No route found (${data.code})`);
      }

      // OSRM returns the best route first, then alternatives.
      const parsed = data.routes.map((r, i) => {
        const points = toPoints(r.geometry.coordinates);
        const distanceKm = r.distance / 1000;
        return {
          index: i,
          isAlternative: i > 0,
          distanceKm: Number(distanceKm.toFixed(2)),
          durationMinutes: Math.round(r.duration / 60),
          suggestedPrice: Math.round((distanceKm * PRICE_PER_KM) / 50) * 50,
          points,
        };
      });

      setRoutes(parsed);
      setSelectedIndex(0); // main route is selected by default
      setStatus("ready");

      console.log(
        `[OSRM] ${parsed.length} route(s) found:`,
        parsed.map((r) => ({
          index: r.index,
          type: r.isAlternative ? "alternative" : "main",
          distanceKm: r.distanceKm,
          durationMinutes: r.durationMinutes,
          points: r.points.length,
        }))
      );
    } catch (e) {
      const msg =
        e.name === "AbortError" ? "Request timed out. Try again." : e.message;
      console.log("[OSRM] Failed:", msg);
      setErrorText(msg);
      setStatus("error");
    } finally {
      clearTimeout(timer);
    }
  }, [origin, destination]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // Fit map to the routes once they arrive
  useEffect(() => {
    if (status !== "ready" || !routes.length) return;
    const all = routes.flatMap((r) => r.points);
    const t = setTimeout(() => {
      mapRef.current?.fitToCoordinates(all, {
        edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
        animated: true,
      });
    }, 300);
    return () => clearTimeout(t);
  }, [status, routes]);

  const selected = routes[selectedIndex];

  // ---------- save (console only for now) ----------
  function handleSave() {
    if (!selected) return;

    const payload = {
      origin,
      destination,
      selectedRoute: {
        index: selected.index,
        type: selected.isAlternative ? "alternative" : "main",
        distanceKm: selected.distanceKm,
        durationMinutes: selected.durationMinutes,
        suggestedPrice: selected.suggestedPrice,
        totalPoints: selected.points.length,
        points: selected.points,
      },
      alternativesAvailable: routes.length - 1,
      savedAt: new Date().toISOString(),
    };

    console.log("========== DATA TO SAVE ==========");
    console.log("Origin:", JSON.stringify(payload.origin));
    console.log("Destination:", JSON.stringify(payload.destination));
    console.log("Chosen:", payload.selectedRoute.type, `(#${selected.index})`);
    console.log("Distance (km):", payload.selectedRoute.distanceKm);
    console.log("Duration (min):", payload.selectedRoute.durationMinutes);
    console.log("Suggested price (Rs.):", payload.selectedRoute.suggestedPrice);
    console.log("Total points:", payload.selectedRoute.totalPoints);
    console.log("Full payload:");
    console.log(JSON.stringify(payload, null, 2));
    console.log("==================================");

    Alert.alert(
      "Route saved",
      `${payload.selectedRoute.totalPoints} points printed to the console.`
    );
  }

  // Draw unselected routes first so the selected one sits on top
  const drawOrder = useMemo(
    () => [...routes].sort((a, b) => (a.index === selectedIndex) - (b.index === selectedIndex)),
    [routes, selectedIndex]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {origin.placeName} → {destination.placeName}
        </Text>
      </View>

      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude: (origin.latitude + destination.latitude) / 2,
            longitude: (origin.longitude + destination.longitude) / 2,
            latitudeDelta: Math.abs(origin.latitude - destination.latitude) * 1.6 + 0.05,
            longitudeDelta: Math.abs(origin.longitude - destination.longitude) * 1.6 + 0.05,
          }}
        >
          <Marker coordinate={origin} title={origin.placeName} pinColor="green" />
          <Marker coordinate={destination} title={destination.placeName} pinColor="red" />

          {drawOrder.map((r) => {
            const isSelected = r.index === selectedIndex;
            return (
              <Polyline
                key={`${r.index}-${isSelected}`}
                coordinates={r.points}
                strokeColor={isSelected ? SELECTED_COLOR : ALT_COLOR}
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
            <ActivityIndicator size="large" />
            <Text style={styles.overlayText}>Getting routes from OSRM...</Text>
          </View>
        )}

        {status === "error" && (
          <View style={styles.overlay}>
            <Text style={styles.errorText}>{errorText}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchRoutes}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.listWrap}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {status === "ready" && (
          <Text style={styles.hint}>
            Tap a route here or on the map to choose it.
          </Text>
        )}

        {routes.map((r) => {
          const isSelected = r.index === selectedIndex;
          return (
            <TouchableOpacity
              key={r.index}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelectedIndex(r.index)}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: isSelected ? SELECTED_COLOR : ALT_COLOR },
                ]}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {r.isAlternative ? `Alternative route ${r.index}` : "Main route"}
                  {isSelected ? "  ✓ Selected" : ""}
                </Text>
                <Text style={styles.cardSub}>
                  {r.distanceKm} km · {r.durationMinutes} min · {r.points.length} points
                </Text>
              </View>
              <Text style={styles.price}>Rs. {r.suggestedPrice}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[styles.saveBtn, status !== "ready" && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={status !== "ready"}
        >
          <Text style={styles.saveText}>Save selected route</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 8 },
  back: { fontSize: 15, color: SELECTED_COLOR, fontWeight: "600", marginBottom: 6 },
  title: { fontSize: 20, fontWeight: "800", color: "#111" },

  mapWrap: { height: 320, backgroundColor: "#EEE" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  overlayText: { marginTop: 10, fontSize: 13, fontWeight: "600", color: "#333" },
  errorText: { fontSize: 14, color: "#C62828", fontWeight: "600", textAlign: "center" },
  retryBtn: {
    marginTop: 12,
    backgroundColor: SELECTED_COLOR,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontWeight: "700" },

  listWrap: { flex: 1 },
  listContent: { padding: 18, paddingBottom: 60 },
  hint: { fontSize: 12, color: "#777", marginBottom: 10 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6F7F9",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: { borderColor: SELECTED_COLOR, backgroundColor: "#EAF2FE" },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#111" },
  cardSub: { fontSize: 12, color: "#666", marginTop: 3 },
  price: { fontSize: 14, fontWeight: "800", color: "#111" },

  saveBtn: {
    backgroundColor: SELECTED_COLOR,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});