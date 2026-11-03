import React, {
     useEffect, 
     useState, 
     useCallback, 
     useRef, 
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";


import RouteMapView from "./RouteMapView";
import RouteSummary from "./RouteSummary";
import FullScreenRouteModal from "./FullScreenRouteModal";



const OSRM_URL =
  "https://router.project-osrm.org/route/v1/driving";

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

  const onRouteCalculatedRef = useRef(onRouteCalculated);
  useEffect(() => {
  onRouteCalculatedRef.current = onRouteCalculated;
    }, [onRouteCalculated]);
  // Notify parent whenever the selected route changes.
  const notifySelectedRoute = useCallback((route) => {
  if (!route) return;

  onRouteCalculatedRef.current?.({
    distanceKm: Number(route.distanceKm),
    durationMinutes: route.durationMinutes,
  });
}, []);

  // Calculate multiple OSRM routes.
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
        setRoutes([]);
        setSelectedRouteIndex(0);
        setLoading(false);
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
        setRoutes([]);
        setSelectedRouteIndex(0);
        setLoading(false);
        setError("Invalid pickup or destination coordinates");
        return;
      }

      if (oLat === dLat && oLng === dLng) {
        setRoutes([]);
        setSelectedRouteIndex(0);
        setLoading(false);
        setError("Choose two different locations");
        return;
      }

      try {

        setLoading(true);
        setError("");
        setRoutes([]);
        setSelectedRouteIndex(0);

        const url =
          `${OSRM_URL}/${oLng},${oLat};${dLng},${dLat}` +
          "?alternatives=3&overview=full&geometries=geojson";

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("OSRM server request failed");
        }

        const data = await response.json();

        if (
          data.code !== "Ok" ||
          !data.routes ||
          data.routes.length === 0
        ) {
          throw new Error("No driving route found");
        }

        if (cancelled) return;

        // Convert OSRM results and sort by shortest distance.
        const availableRoutes = data.routes
          .map((item, index) => ({
            id: index,
            geometry: item.geometry,
            distanceKm: (item.distance / 1000).toFixed(2),
            durationMinutes: Math.round(item.duration / 60),
            distanceMeters: item.distance,
          }))
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
          .map((item, index) => ({
            ...item,
            id: index,
          }));

        setRoutes(availableRoutes);
        setSelectedRouteIndex(0);

        notifySelectedRoute(availableRoutes[0]);

      } catch (err) {

        if (err.name !== "AbortError" && !cancelled) {
          console.error("OSRM error:", err);
          setError(err.message || "Unable to calculate route");
        }

      } finally {

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

  }, [
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    notifySelectedRoute,
  ]);

  // Handle messages received from the Leaflet WebView.
  const handleWebViewMessage = useCallback((event) => {

    try {

      const message = JSON.parse(event.nativeEvent.data);

      if (message.type === "routeSelected") {

        const index = message.index;

        if (index >= 0 && index < routes.length) {

          setSelectedRouteIndex(index);

          notifySelectedRoute(routes[index]);

        }

      }

    } catch (err) {
      console.error("Route selection error:", err);
    }

  }, [routes, notifySelectedRoute]);

  const selectedRoute = routes[selectedRouteIndex];

  return (
    <View style={styles.mapCard}>

      {loading ? (

        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color="#5B4BDB"
          />

          <Text style={styles.statusText}>
            Finding alternative road routes...
          </Text>
        </View>

      ) : routes.length > 0 ? (

        <>

          <RouteMapView
            routes={routes}
            selectedRouteIndex={selectedRouteIndex}
            originCoordinates={originCoordinates}
            destinationCoordinates={destinationCoordinates}
            onMessage={handleWebViewMessage}
            style={styles.map}
          />

          <Pressable
            style={styles.expandButton}
            onPress={() => setMapExpanded(true)}
          >
            <Text style={styles.expandText}>
              ⛶ Full screen
            </Text>
          </Pressable>

          <View style={styles.summary}>

            <RouteSummary
              origin={origin}
              destination={destination}
              selectedRoute={selectedRoute}
              totalRoutes={routes.length}
            />

          </View>

          <View style={styles.legend}>

            <View style={styles.legendItem}>
              <View style={styles.blueLine} />
              <Text style={styles.legendText}>Selected</Text>
            </View>

            <View style={styles.legendItem}>
              <View style={styles.redLine} />
              <Text style={styles.legendText}>Alternative</Text>
            </View>

          </View>

        </>

      ) : (

        <View style={styles.center}>

          <Text style={styles.errorText}>
            {error || "Select pickup and destination"}
          </Text>

          <Text style={styles.hint}>
            Your road routes will appear here.
          </Text>

        </View>

      )}

      <FullScreenRouteModal
        visible={mapExpanded}
        onClose={() => setMapExpanded(false)}
        routes={routes}
        selectedRouteIndex={selectedRouteIndex}
        origin={origin}
        destination={destination}
        originCoordinates={originCoordinates}
        destinationCoordinates={destinationCoordinates}
        onMessage={handleWebViewMessage}
      />

    </View>
  );
}

const styles = StyleSheet.create({

  mapCard: {
    height: 260,
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
    fontSize: 12,
    color: "#29243F",
    fontWeight: "800",
  },

  summary: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
  },

  legend: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#FFFFFF",
    padding: 8,
    borderRadius: 9,
    gap: 5,
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  blueLine: {
    width: 18,
    height: 4,
    backgroundColor: "#2563EB",
    borderRadius: 5,
  },

  redLine: {
    width: 18,
    height: 4,
    backgroundColor: "#E53935",
    borderRadius: 5,
  },

  legendText: {
    fontSize: 10,
    color: "#29243F",
    fontWeight: "600",
  },

});
