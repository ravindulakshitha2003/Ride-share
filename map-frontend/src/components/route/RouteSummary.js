
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function RouteSummary({
  origin,
  destination,
  selectedRoute,
  totalRoutes,
}) {

  if (!selectedRoute) return null;

  return (
    <View style={styles.container}>

      <Text style={styles.title} numberOfLines={1}>
        {origin} → {destination}
      </Text>

      <Text style={styles.distance}>
        {selectedRoute.distanceKm} km
        {"  •  "}
        {selectedRoute.durationMinutes} min
      </Text>

      <Text style={styles.alternative}>
        Route {selectedRoute.id + 1} of {totalRoutes}
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 11,
  },

  title: {
    fontSize: 12,
    fontWeight: "800",
    color: "#29243F",
  },

  distance: {
    marginTop: 5,
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "800",
  },

  alternative: {
    marginTop: 4,
    fontSize: 10,
    color: "#777777",
  },

});
