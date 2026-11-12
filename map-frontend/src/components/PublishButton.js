
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { ArrowRight } from "lucide-react-native";
import { COLORS } from "../theme/colors";

export default function PublishButton({ onPress }) {
  function handlePress() {
    console.log("handlePublish started");
    console.log("Publish button tapped successfully");

    console.log("Publish button tapped");

    if (typeof onPress === "function") {
      onPress();
    } else {
      console.log("ERROR: onPress function is missing");
    }
  }

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.buttonContent}>
        <Text style={styles.buttonText}>Publish ride</Text>
      </View>
      <ArrowRight size={21} color={COLORS.white} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 49,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonContent: {
    flex: 1,
    alignItems: "center",
    paddingLeft: 21,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "800",
  },
});
