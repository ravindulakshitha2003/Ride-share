
import React, { useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { completeMapPickerSelection } from "../context/mapNavigation";
import { getApiBaseUrl } from "../api/map/baseUrl";

import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from "react-native";

import { WebView } from "react-native-webview";

const API_URL = getApiBaseUrl();

const INITIAL_LAT = 9.6615;
const INITIAL_LNG = 80.0255;

function createMapHtml(latitude, longitude) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport"
    content="width=device-width, initial-scale=1.0, maximum-scale=1.0">

  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />

  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
    }
  </style>
</head>

<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>

  <script>
    const initialLat = ${Number(latitude)};
    const initialLng = ${Number(longitude)};

    const map = L.map("map").setView(
      [initialLat, initialLng],
      12
    );

    L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }
    ).addTo(map);

    let marker = L.marker(
      [initialLat, initialLng],
      { draggable: true }
    ).addTo(map);

    function sendLocation(lat, lng) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "locationSelected",
          latitude: lat,
          longitude: lng
        })
      );
    }

    map.on("click", function(event) {
      marker.setLatLng(event.latlng);

      sendLocation(
        event.latlng.lat,
        event.latlng.lng
      );
    });

    marker.on("dragend", function(event) {
      const position = event.target.getLatLng();

      sendLocation(
        position.lat,
        position.lng
      );
    });

    // Called by React Native after selecting a search result.
    window.moveMapTo = function(lat, lng) {
      const position = [lat, lng];

      marker.setLatLng(position);
      map.setView(position, 15);

      sendLocation(lat, lng);
    };

    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: "mapReady" })
    );
  </script>
</body>
</html>
`;
}

export default function MapPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialLocation = {
    latitude: Number(params.latitude),
    longitude: Number(params.longitude),
    placeName: params.placeName || "",
  };

  const mapRef = useRef(null);

  const [location, setLocation] = useState(() => {
    const lat = Number(initialLocation?.latitude);
    const lng = Number(initialLocation?.longitude);

    return {
      latitude: Number.isFinite(lat) ? lat : INITIAL_LAT,
      longitude: Number.isFinite(lng) ? lng : INITIAL_LNG,
      placeName: initialLocation?.placeName || "",
    };
  });

  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Search places through the backend.
  async function searchPlaces() {
    const query = searchText.trim();

    if (query.length < 3) {
      setSearchError("Enter at least 3 characters.");
      setResults([]);
      return;
    }

    Keyboard.dismiss();

    try {
      setSearching(true);
      setSearchError("");
      setResults([]);

      const response = await fetch(
        `${API_URL}/api/geocode/search?q=${encodeURIComponent(query)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Place search failed."
        );
      }

      setResults(data.results || []);

      if (!data.results || data.results.length === 0) {
        setSearchError("No matching places found.");
      }

    } catch (error) {
      console.error("Place search error:", error);
      setSearchError(error.message || "Unable to search places.");
    } finally {
      setSearching(false);
    }
  }

  // Select a search result and move the Leaflet map.
  function selectPlace(place) {
    const selectedLocation = {
      latitude: place.latitude,
      longitude: place.longitude,
      placeName: place.placeName,
    };

    setLocation(selectedLocation);
    setSearchText(place.placeName);
    setResults([]);
    setSearchError("");
    Keyboard.dismiss();

    const javascript = `
      if (window.moveMapTo) {
        window.moveMapTo(
          ${place.latitude},
          ${place.longitude}
        );
      }
      true;
    `;

    mapRef.current?.injectJavaScript(javascript);
  }

  // Receive coordinates from Leaflet.
  function handleMapMessage(event) {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "mapReady") {
        setMapReady(true);
        return;
      }

      if (
        data.type === "locationSelected" &&
        Number.isFinite(data.latitude) &&
        Number.isFinite(data.longitude)
      ) {
        setLocation({
          latitude: data.latitude,
          longitude: data.longitude,
          placeName: "",
        });
      }

    } catch (error) {
      console.warn("Map message error:", error);
    }
  }

  // Confirm selected location.
  function confirmLocation() {
    if (!mapReady) return;

    completeMapPickerSelection(location);
    router.back();
  }

  return (
    <View style={styles.container}>

      {/* Search section */}
      <View style={styles.searchPanel}>

        <Text style={styles.title}>
          Search your location
        </Text>

        <View style={styles.searchRow}>

          <TextInput
            style={styles.searchInput}
            placeholder="Search Jaffna, Colombo, Vavuniya..."
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              setSearchError("");
              setResults([]);
            }}
            onSubmitEditing={searchPlaces}
            returnKeyType="search"
          />

          <TouchableOpacity
            style={styles.searchButton}
            onPress={searchPlaces}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.searchButtonText}>
                Search
              </Text>
            )}
          </TouchableOpacity>

        </View>

        {!!searchError && (
          <Text style={styles.errorText}>
            {searchError}
          </Text>
        )}

        {/* Search results */}
        {results.length > 0 && (
          <FlatList
            data={results}
            keyExtractor={(item, index) =>
              `${item.latitude}-${item.longitude}-${index}`
            }
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => selectPlace(item)}
              >
                <Text style={styles.resultTitle}>
                  {item.placeName}
                </Text>

                <Text style={styles.resultCoordinates}>
                  {item.latitude.toFixed(5)},
                  {" "}
                  {item.longitude.toFixed(5)}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}

      </View>

      {/* Leaflet map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={mapRef}
          style={styles.map}
          originWhitelist={["*"]}
          source={{
            html: createMapHtml(
              location.latitude,
              location.longitude
            ),
          }}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMapMessage}
        />
      </View>

      {/* Confirmation panel */}
      <View style={styles.bottomPanel}>

        <Text style={styles.confirmTitle}>
          Confirm your location
        </Text>

        {!!location.placeName && (
          <Text style={styles.placeName} numberOfLines={2}>
            {location.placeName}
          </Text>
        )}

        <Text style={styles.coordinates}>
          Latitude: {location.latitude.toFixed(5)}
          {"\n"}
          Longitude: {location.longitude.toFixed(5)}
        </Text>

        <TouchableOpacity
          style={[
            styles.confirmButton,
            !mapReady && styles.disabledButton,
          ]}
          onPress={confirmLocation}
          disabled={!mapReady}
        >
          <Text style={styles.confirmButtonText}>
            {mapReady
              ? "Confirm location"
              : "Loading map..."}
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  searchPanel: {
    padding: 14,
    backgroundColor: "#FFFFFF",
    zIndex: 2,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    color: "#29243F",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  searchInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: "#DDDAF5",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#29243F",
  },

  searchButton: {
    height: 46,
    paddingHorizontal: 16,
    backgroundColor: "#5B4BDB",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  searchButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  resultsList: {
    maxHeight: 180,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    borderRadius: 10,
  },

  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  resultTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#29243F",
  },

  resultCoordinates: {
    marginTop: 4,
    fontSize: 11,
    color: "#777777",
  },

  errorText: {
    marginTop: 8,
    color: "#B00020",
    fontSize: 12,
  },

  mapContainer: {
    flex: 1,
    overflow: "hidden",
  },

  map: {
    flex: 1,
  },

  bottomPanel: {
    padding: 16,
    backgroundColor: "#FFFFFF",
  },

  confirmTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
    color: "#29243F",
  },

  placeName: {
    fontSize: 12,
    color: "#5B4BDB",
    marginBottom: 8,
  },

  coordinates: {
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 12,
    color: "#555555",
  },

  confirmButton: {
    backgroundColor: "#5B4BDB",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.6,
  },

  confirmButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
