
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { WebView } from "react-native-webview";

const INITIAL_LAT = 9.6615;
const INITIAL_LNG = 80.0255;

function createMapHtml(latitude, longitude) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
  <style>
    html, body, #map {
      height: 100%;
      width: 100%;
      margin: 0;
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${latitude}, ${longitude}], 12);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker = L.marker([${latitude}, ${longitude}], {
      draggable: true
    }).addTo(map);

    function sendLocation(latlng) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        latitude: latlng.lat,
        longitude: latlng.lng
      }));
    }

    map.on('click', function(event) {
      marker.setLatLng(event.latlng);
      sendLocation(event.latlng);
    });

    marker.on('dragend', function(event) {
      sendLocation(event.target.getLatLng());
    });
  </script>
</body>
</html>`;
}

export default function MapPickerScreen({ navigation, route }) {
  const { onSelectLocation, initialLocation } = route.params || {};

  const [location, setLocation] = useState(
    initialLocation || {
      latitude: INITIAL_LAT,
      longitude: INITIAL_LNG,
    }
  );

  const [mapReady, setMapReady] = useState(false);

  function handleMapMessage(event) {
    try {
      const selected = JSON.parse(event.nativeEvent.data);
      setLocation(selected);
    } catch (error) {
      console.warn("Could not read map coordinates", error);
    }
  }

  function confirmLocation() {
    if (typeof onSelectLocation === "function") {
      onSelectLocation(location);
    }

    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <WebView
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
        onLoadEnd={() => setMapReady(true)}
      />

      <View style={styles.panel}>
        <Text style={styles.title}>Choose your location</Text>

        <Text style={styles.coordinates}>
          Latitude: {location.latitude.toFixed(5)}
          {"\n"}
          Longitude: {location.longitude.toFixed(5)}
        </Text>

        <TouchableOpacity
          style={[
            styles.button,
            !mapReady && styles.disabledButton,
          ]}
          onPress={confirmLocation}
          disabled={!mapReady}
        >
          <Text style={styles.buttonText}>
            {mapReady ? "Confirm location" : "Loading map..."}
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
  map: {
    flex: 1,
  },
  panel: {
    padding: 20,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  coordinates: {
    fontSize: 14,
    marginBottom: 14,
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#5B4BDB",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
