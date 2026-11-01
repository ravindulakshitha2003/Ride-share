
import React from "react";

import {
  Modal,
  View,
  Text,
  Pressable,
  StatusBar,
  StyleSheet,
} from "react-native";

import RouteMapView from "./RouteMapView";
import RouteSummary from "./RouteSummary";

export default function FullScreenRouteModal({
  visible,
  onClose,
  routes,
  selectedRouteIndex,
  origin,
  destination,
  originCoordinates,
  destinationCoordinates,
  onMessage,
}) {

  const selectedRoute = routes[selectedRouteIndex];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.container}>

        <StatusBar
          backgroundColor="#FFFFFF"
          barStyle="dark-content"
        />

        <RouteMapView
          routes={routes}
          selectedRouteIndex={selectedRouteIndex}
          originCoordinates={originCoordinates}
          destinationCoordinates={destinationCoordinates}
          onMessage={onMessage}
          style={styles.map}
        />

        <Pressable
          style={styles.closeButton}
          onPress={onClose}
        >
          <Text style={styles.closeText}>
            ✕ Close map
          </Text>
        </Pressable>

        <View style={styles.bottomPanel}>

          <RouteSummary
            origin={origin}
            destination={destination}
            selectedRoute={selectedRoute}
            totalRoutes={routes.length}
          />

          <Text style={styles.instruction}>
            Tap a red route to select another route.
          </Text>

        </View>

      </View>
    </Modal>
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

  closeButton: {
    position: "absolute",
    top: 48,
    right: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 17,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 6,
  },

  closeText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#29243F",
  },

  bottomPanel: {
    backgroundColor: "#FFFFFF",
    padding: 15,
    paddingBottom: 25,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },

  instruction: {
    marginTop: 8,
    fontSize: 12,
    color: "#777777",
    textAlign: "center",
  },

});
