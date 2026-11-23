import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

// step.status: "pending" | "active" | "done" | "error"
export default function RouteProgress({ steps }) {
  const doneCount = steps.filter((s) => s.status === "done").length;
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <View style={styles.card}>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${percent}%` }]} />
      </View>

      {steps.map((step, index) => (
        <View key={index} style={styles.row}>
          <View style={styles.icon}>
            {step.status === "active" ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text
                style={[
                  styles.mark,
                  step.status === "done" && { color: "#21834A" },
                  step.status === "error" && { color: "#C62828" },
                ]}
              >
                {step.status === "done"
                  ? "✓"
                  : step.status === "error"
                  ? "✕"
                  : "○"}
              </Text>
            )}
          </View>

          <Text
            style={[
              styles.label,
              step.status === "pending" && { opacity: 0.45 },
            ]}
          >
            {step.label}
          </Text>
        </View>
      ))}

      <Text style={styles.percent}>{percent}% complete</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginVertical: 10,
  },
  barBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E6E6E6",
    overflow: "hidden",
    marginBottom: 12,
  },
  barFill: {
    height: 6,
    backgroundColor: "#21834A",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  icon: {
    width: 26,
    alignItems: "center",
  },
  mark: {
    fontSize: 15,
    fontWeight: "700",
    color: "#999",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  percent: {
    fontSize: 11,
    color: "#888",
    marginTop: 8,
    textAlign: "right",
  },
});