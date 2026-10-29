import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { MapPin, CarFront } from "lucide-react-native";
import { COLORS } from "../theme/colors";

export default function RoutePreview({ origin, destination }) {
  return (
    <View style={styles.mapCard}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 340 200"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Path
          d="M-10 35 C55 10 80 55 120 38 S210 12 260 48 S310 80 360 35"
          stroke="#FFFFFF"
          strokeWidth="5"
          fill="none"
        />
        <Path
          d="M10 155 C70 125 55 90 110 100 S190 160 240 130 S300 120 350 160"
          stroke="#FFFFFF"
          strokeWidth="4"
          fill="none"
        />
        <Path
          d="M35 0 C65 50 40 80 90 115 S150 145 150 200"
          stroke="#D6E9C9"
          strokeWidth="13"
          fill="none"
        />
        <Path
          d="M55 42 C80 58 75 84 120 95 S170 120 215 112 S255 130 278 143"
          stroke={COLORS.primary}
          strokeWidth="4"
          strokeDasharray="7 6"
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx="55" cy="42" r="5" fill={COLORS.primary} />
        <Circle cx="278" cy="143" r="5" fill="#D946EF" />
      </Svg>

      <View style={styles.pickup}>
        <MapPin size={23} color={COLORS.primary} fill={COLORS.primary} />
        <Text style={styles.mapLabel} numberOfLines={1}>
          {origin || "Pickup"}
        </Text>
      </View>

      <View style={styles.destination}>
        <MapPin size={23} color="#D946EF" fill="#D946EF" />
        <Text style={styles.mapLabel} numberOfLines={1}>
          {destination || "Destination"}
        </Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.carIcon}>
          <CarFront size={22} color={COLORS.secondary} />
        </View>
        <View style={styles.summaryText}>
          <Text style={styles.routeTitle} numberOfLines={1}>
            {origin || "Pickup"} → {destination || "Destination"}
          </Text>
          <Text style={styles.routeSubtitle}>Route preview</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapCard: {
    height: 205,
    marginBottom: 12,
    borderRadius: 17,
    overflow: "hidden",
    backgroundColor: "#CBE6F9",
  },
  pickup: {
    position: "absolute",
    left: "14%",
    top: "17%",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  destination: {
    position: "absolute",
    right: "5%",
    top: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  mapLabel: {
    maxWidth: 105,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: COLORS.white,
    color: COLORS.secondary,
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
  },
  summary: {
    position: "absolute",
    left: 9,
    right: 38,
    bottom: 9,
    minHeight: 47,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.96)",
  },
  carIcon: {
    width: 31,
    height: 31,
    borderRadius: 9,
    backgroundColor: COLORS.lightPurple,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryText: {
    flex: 1,
    minWidth: 0,
  },
  routeTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.secondary,
  },
  routeSubtitle: {
    fontSize: 10,
    color: COLORS.muted,
    marginTop: 2,
  },
});