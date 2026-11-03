import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  StatusBar,
} from "react-native";
import { WebView } from "react-native-webview";



const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";

// Any https URL works; it only gives the WebView a real origin/Referer
// so OpenStreetMap tile servers accept the tile requests.
const WEBVIEW_BASE_URL = "https://localhost/";

// Safely embed JSON inside a <script> tag.
function safeJson(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}


function createRouteMapHtml(routes, selectedIndex, origin, destination) {
  const routesJson = safeJson(routes);
  const originJson = safeJson(origin);
  const destinationJson = safeJson(destination);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
<div id="map"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  const map = L.map("map", { zoomControl: false });

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  const routes = ${routesJson};
  const origin = ${originJson};
  const destination = ${destinationJson};

  let selectedIndex = ${selectedIndex};
  const routeLayers = [];

  function drawRoutes() {
    routeLayers.forEach(layer => map.removeLayer(layer));
    routeLayers.length = 0;

    routes.forEach((route, index) => {
      const selected = index === selectedIndex;

      const layer = L.geoJSON(route.geometry, {
        style: {
          color: selected ? "#2563EB" : "#E53935",
          weight: selected ? 7 : 5,
          opacity: selected ? 1 : 0.75
        }
      }).addTo(map);

      layer.on("click", () => {
        selectedIndex = index;
        drawRoutes();

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "routeSelected",
          index: index
        }));
      });

      routeLayers.push(layer);
    });
  }

  L.marker([origin.latitude, origin.longitude])
    .addTo(map).bindPopup("Pickup");

  L.marker([destination.latitude, destination.longitude])
    .addTo(map).bindPopup("Destination");

  drawRoutes();

  const allCoordinates = routes.flatMap(route =>
    route.geometry.coordinates.map(point => [point[1], point[0]])
  );

  if (allCoordinates.length) {
    map.fitBounds(allCoordinates, { padding: [25, 25] });
  }
</script>
</body>
</html>`;
}


export default function RoutePreview({
  origin,
  destination,
  originCoordinates,
  destinationCoordinates,
  onRouteCalculated,
}) {
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mapExpanded, setMapExpanded] = useState(false);

  const originLat = originCoordinates?.latitude;
  const originLng = originCoordinates?.longitude;
  const destinationLat = destinationCoordinates?.latitude;
  const destinationLng = destinationCoordinates?.longitude;

  

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function calculateRoute() {
      if (
        originLat == null ||
        originLng == null ||
        destinationLat == null ||
        destinationLng == null
      ) {
        setLoading(false);
        setRoutes([]);
        setSelectedRouteIndex(0);
        setError("Select both locations on the map");
        return;
      }

      const oLat = Number(originLat);
      const oLng = Number(originLng);
      const dLat = Number(destinationLat);
      const dLng = Number(destinationLng);

      if (
        !Number.isFinite(oLat) ||
        !Number.isFinite(oLng) ||
        !Number.isFinite(dLat) ||
        !Number.isFinite(dLng) ||
        Math.abs(oLat) > 90 ||
        Math.abs(dLat) > 90 ||
        Math.abs(oLng) > 180 ||
        Math.abs(dLng) > 180
      ) {
        setLoading(false);
        setRoutes([]);
        setSelectedRouteIndex(0);
        setError("Invalid pickup or destination coordinates");
        return;
      }

      if (oLat === dLat && oLng === dLng) {
        setLoading(false);
        setRoutes([]);
        setSelectedRouteIndex(0);
        setError("Choose two different locations");
        return;
      }

      try {
        setLoading(true);
        setError("");
        setRoutes([]);
        setSelectedRouteIndex(0);
        const url =
  `${OSRM_URL}/${originLng},${originLat};${destinationLng},${destinationLat}` +
  `?alternatives=3&overview=full&geometries=geojson`;


        

        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          throw new Error("OSRM server request failed");
        }

        const data = await response.json();

        if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
          throw new Error("No driving route found");
        }

        if (cancelled) return;

        const availableRoutes = data.routes.map((item, index) => ({
          id: index,
          geometry: item.geometry,
          distanceKm: (item.distance / 1000).toFixed(2),
          durationMinutes: Math.round(item.duration / 60),
      }));

      setRoutes(availableRoutes);
      setSelectedRouteIndex(0);

      // Automatically select the first route
      onRouteCalculated?.({
        distanceKm: Number(availableRoutes[0].distanceKm),
        durationMinutes: availableRoutes[0].durationMinutes,
      });
      } catch (err) {
        if (err.name !== "AbortError" && !cancelled) {
          console.error("OSRM error:", err);
          setError(err.message || "Unable to calculate route");
        }
      } finally {
        // Only the latest (non-cancelled) run controls the spinner.
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    calculateRoute();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [originLat, originLng, destinationLat, destinationLng]);

  // Rebuild the HTML only when the route changes, so the WebView
  // doesn't reload on unrelated parent re-renders.
  
const webViewSource = useMemo(() => {
  if (!routes.length) return null;

  return {
    html: createRouteMapHtml(
      routes,
      selectedRouteIndex,
      { latitude: originLat, longitude: originLng },
      { latitude: destinationLat, longitude: destinationLng }
    ),
    baseUrl: WEBVIEW_BASE_URL,
  };
}, [
  routes,
  selectedRouteIndex,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
]);


function handleWebViewMessage(event) {
  try {
    const message = JSON.parse(event.nativeEvent.data);

    if (message.type === "routeSelected") {
      const index = message.index;

      if (index >= 0 && index < routes.length) {
        setSelectedRouteIndex(index);

        const selectedRoute = routes[index];

        onRouteCalculated?.({
          distanceKm: Number(selectedRoute.distanceKm),
          durationMinutes: selectedRoute.durationMinutes,
        });
      }
    }
  } catch (error) {
    console.error("Route selection error:", error);
  }
}



  return (
    <View style={styles.mapCard}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#5B4BDB" />
          <Text style={styles.statusText}>Calculating road route...</Text>
        </View>
      ) : routes.length > 0 && webViewSource ? (
        <>
          <View style={styles.mapContainer}>
    <WebView
      style={styles.map}
      originWhitelist={["*"]}
      source={webViewSource}
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleWebViewMessage}
    />

    <Pressable
      style={styles.expandButton}
      onPress={() => setMapExpanded(true)}
    >
      <Text style={styles.expandText}>⛶ Expand map</Text>
    </Pressable>
    </View>

          <View style={styles.summary}>
            <Text style={styles.routeTitle} numberOfLines={1}>
              {origin} → {destination}
            </Text>

            <Text style={styles.routeSubtitle}>
              {routes[selectedRouteIndex]?.distanceKm} km •{" "}
              {routes[selectedRouteIndex]?.durationMinutes} min
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.center}>
          <Text style={styles.errorText}>
            {error || "Select pickup and destination"}
          </Text>

          <Text style={styles.hint}>
            Your actual road route will appear here.
          </Text>
        </View>
      )}
    
      <Modal
        visible={mapExpanded}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setMapExpanded(false)}
      >
        <View style={styles.fullScreenContainer}>
          <StatusBar
            backgroundColor="#FFFFFF"
            barStyle="dark-content"
          />

          {webViewSource && (
            <WebView
              style={styles.fullScreenMap}
              originWhitelist={["*"]}
              source={webViewSource}
              javaScriptEnabled
              domStorageEnabled
              onMessage={handleWebViewMessage}
            />
          )}

          <Pressable
            style={styles.closeMapButton}
            onPress={() => setMapExpanded(false)}
          >
            <Text style={styles.closeMapText}>
              ✕ Close map
            </Text>
          </Pressable>

          <View style={styles.fullScreenSummary}>
            <Text style={styles.fullScreenTitle}>
              {origin} → {destination}
            </Text>

            <Text style={styles.fullScreenSubtitle}>
              {routes[selectedRouteIndex]?.distanceKm} km
              {" • "}
              {routes[selectedRouteIndex]?.durationMinutes} min
            </Text>
          </View>
        </View>
      </Modal>

    </View>
    
  
  );
}

const styles = StyleSheet.create({
  mapCard: {
    height: 205,
    marginBottom: 12,
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "#EAF2F8",
  },

  map: {
    flex: 1,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
  },

  statusText: {
    marginTop: 10,
    fontSize: 13,
    color: "#555555",
  },

  errorText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#B00020",
    textAlign: "center",
  },

  hint: {
    marginTop: 6,
    fontSize: 12,
    color: "#777777",
    textAlign: "center",
  },

  summary: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
  },

  routeTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#29243F",
  },

  routeSubtitle: {
    marginTop: 3,
    fontSize: 11,
    color: "#5B4BDB",
    fontWeight: "700",
  },
  mapContainer: {
  flex: 1,
  position: "relative",
},

expandButton: {
  position: "absolute",
  top: 10,
  right: 10,
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 12,
  paddingVertical: 9,
  borderRadius: 10,
  elevation: 4,
},

expandText: {
  color: "#29243F",
  fontSize: 12,
  fontWeight: "700",
},

fullScreenContainer: {
  flex: 1,
  backgroundColor: "#FFFFFF",
},

fullScreenMap: {
  flex: 1,
},

closeMapButton: {
  position: "absolute",
  top: 45,
  right: 18,
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderRadius: 12,
  elevation: 5,
},

closeMapText: {
  color: "#29243F",
  fontWeight: "800",
  fontSize: 14,
},

fullScreenSummary: {
  padding: 18,
  backgroundColor: "#FFFFFF",
  borderTopWidth: 1,
  borderTopColor: "#EEEEEE",
},

fullScreenTitle: {
  fontSize: 15,
  fontWeight: "800",
  color: "#29243F",
},

fullScreenSubtitle: {
  marginTop: 6,
  fontSize: 13,
  fontWeight: "700",
  color: "#5B4BDB",
},
});
