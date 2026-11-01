
import React, { useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import { WebView } from "react-native-webview";

import { createRouteMapHtml } from "./routeMapHtml";

const WEBVIEW_BASE_URL = "https://localhost/";

export default function RouteMapView({
  routes,
  selectedRouteIndex,
  originCoordinates,
  destinationCoordinates,
  onMessage,
  style,
}) {

  const webViewSource = useMemo(() => {

    // Check that routes and coordinates are available
    if (
      !routes ||
      routes.length === 0 ||
      !originCoordinates ||
      !destinationCoordinates
    ) {
      return null;
    }

    // Check that coordinates contain valid numbers
    const originLat = Number(originCoordinates.latitude);
    const originLng = Number(originCoordinates.longitude);

    const destinationLat = Number(destinationCoordinates.latitude);
    const destinationLng = Number(destinationCoordinates.longitude);

    if (
      !Number.isFinite(originLat) ||
      !Number.isFinite(originLng) ||
      !Number.isFinite(destinationLat) ||
      !Number.isFinite(destinationLng)
    ) {
      return null;
    }

    return {
      html: createRouteMapHtml(
        routes,
        selectedRouteIndex,
        {
          latitude: originLat,
          longitude: originLng,
        },
        {
          latitude: destinationLat,
          longitude: destinationLng,
        }
      ),

      baseUrl: WEBVIEW_BASE_URL,
    };

  }, [
    routes,
    selectedRouteIndex,
    originCoordinates,
    destinationCoordinates,
  ]);

  // Display a message when coordinates are unavailable
  if (!originCoordinates || !destinationCoordinates) {
    return (
      <View style={[styles.center, style]}>
        <Text style={styles.message}>
          Select pickup and destination to view routes.
        </Text>
      </View>
    );
  }

  if (!webViewSource) {
    return (
      <View style={[styles.center, style]}>
        <Text style={styles.message}>
          Waiting for route information...
        </Text>
      </View>
    );
  }

  return (
    <WebView
      style={[styles.map, style]}
      originWhitelist={["*"]}
      source={webViewSource}
      javaScriptEnabled
      domStorageEnabled
      onMessage={onMessage}
      mixedContentMode="always"
    />
  );
}

const styles = StyleSheet.create({

  map: {
    flex: 1,
    backgroundColor: "#EAF2F8",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#EAF2F8",
  },

  message: {
    fontSize: 13,
    color: "#777777",
    textAlign: "center",
  },

});
