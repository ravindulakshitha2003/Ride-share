import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  MapPin,
  LocateFixed,
  ArrowUpDown,
} from "lucide-react-native";
import { COLORS } from "../theme/colors";

export default function LocationCard({
  origin,
  setOrigin,
  destination,
  setDestination,
  onPickOrigin,
  onPickDestination,
   onSwap,
}) {
  function swapLocations() {
    setOrigin(destination);
    setDestination(origin);
  }

  return (
    <View style={styles.card}>
      <LocationRow
        label="From"
        value={origin}
        onChangeText={setOrigin}
        color={COLORS.primary}
        background={COLORS.lightPurple}
        onLocate={onPickOrigin}
      />

      <View style={styles.connector}>
        <View style={styles.dot} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      <LocationRow
        label="To"
        value={destination}
        onChangeText={setDestination}
        color="#D946EF"
        background={COLORS.lightPink}
        onLocate={onPickDestination}
      />

      <TouchableOpacity
        style={styles.swap}
       onPress={onSwap || swapLocations}
        accessibilityLabel="Swap pickup and destination"
      >
        <ArrowUpDown size={17} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

function LocationRow({
  label,
  value,
  onChangeText,
  color,
  background,
  onLocate,
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, { backgroundColor: background }]}>
        <MapPin size={21} color={color} fill={color} />
      </View>

      <View style={styles.inputBox}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          style={styles.input}
          placeholder="Choose location"
          placeholderTextColor={COLORS.muted}
          accessibilityLabel={label === "From" ? "Pickup location" : "Destination"}
        />
      </View>

      <TouchableOpacity
        style={styles.locateButton}
        onPress={onLocate}
        accessibilityLabel={`Choose ${label.toLowerCase()} on map`}
      >
        <LocateFixed size={19} color={COLORS.secondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F0EDFF",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 49,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  inputBox: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 10,
    color: COLORS.muted,
  },
  input: {
    padding: 0,
    minHeight: 20,
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  },
  locateButton: {
    width: 36,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  connector: {
    height: 16,
    marginLeft: 17,
    justifyContent: "center",
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  swap: {
    position: "absolute",
    zIndex: 2,
    right: 46,
    top: "45%",
    width: 29,
    height: 29,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
});