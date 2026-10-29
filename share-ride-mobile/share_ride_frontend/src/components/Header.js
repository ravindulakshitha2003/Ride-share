import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CarFront, UserCircle } from "lucide-react-native";
import { COLORS } from "../theme/colors";

export default function Header({ onProfilePress }) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <CarFront size={23} color={COLORS.white} />
        </View>

        <Text style={styles.brandText}>
          Route<Text style={styles.brandAccent}>Mate</Text>
        </Text>
      </View>

      <TouchableOpacity
        style={styles.avatar}
        onPress={onProfilePress}
        accessibilityLabel="Open driver profile"
      >
        <UserCircle size={24} color={COLORS.secondary} />
        <View style={styles.onlineDot} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    color: COLORS.secondary,
    fontSize: 19,
    fontWeight: "800",
  },
  brandAccent: {
    color: COLORS.primary,
  },
  avatar: {
    width: 39,
    height: 39,
    borderRadius: 22,
    backgroundColor: "#E4E0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
});