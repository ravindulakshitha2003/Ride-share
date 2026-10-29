import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import {
  CalendarDays,
  Clock,
  Users,
  Tag,
} from "lucide-react-native";
import { COLORS } from "../theme/colors";

export default function RideDetails({
  departureDate,
  setDepartureDate,
  departureTime,
  setDepartureTime,
  seats,
  setSeats,
  price,
  setPrice,
}) {
  return (
    <View>
      <View style={styles.twoColumns}>
        <DetailCard icon={CalendarDays} label="Departure date">
          <TextInput
            value={departureDate}
            onChangeText={setDepartureDate}
            style={styles.detailInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.muted}
          />
        </DetailCard>

        <DetailCard icon={Clock} label="Departure time">
          <TextInput
            value={departureTime}
            onChangeText={setDepartureTime}
            style={styles.detailInput}
            placeholder="HH:MM"
            placeholderTextColor={COLORS.muted}
          />
        </DetailCard>
      </View>

      <View style={styles.twoColumns}>
        <DetailCard icon={Users} label="Available seats">
          <View style={styles.seatControls}>
            <TouchableOpacity
              style={styles.seatButton}
              onPress={() => setSeats((value) => Math.max(1, value - 1))}
              accessibilityLabel="Decrease seats"
            >
              <Text style={styles.seatButtonText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.seatNumber}>{seats}</Text>

            <TouchableOpacity
              style={styles.seatButton}
              onPress={() => setSeats((value) => Math.min(8, value + 1))}
              accessibilityLabel="Increase seats"
            >
              <Text style={styles.seatButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </DetailCard>

        <DetailCard icon={Tag} label="Price per seat (LKR)">
          <TextInput
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            style={styles.priceInput}
            placeholder="500"
            placeholderTextColor={COLORS.muted}
          />
        </DetailCard>
      </View>
    </View>
  );
}

function DetailCard({ icon: Icon, label, children }) {
  return (
    <View style={styles.detailCard}>
      <View style={styles.detailIcon}>
        <Icon size={20} color={COLORS.primary} />
      </View>

      <View style={styles.detailBody}>
        <Text style={styles.detailLabel}>{label}</Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  twoColumns: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 11,
  },
  detailCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 74,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F0EDFF",
  },
  detailIcon: {
    width: 33,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.lightPurple,
    alignItems: "center",
    justifyContent: "center",
  },
  detailBody: {
    flex: 1,
    minWidth: 0,
  },
  detailLabel: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 5,
  },
  detailInput: {
    padding: 0,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
    minHeight: 20,
  },
  priceInput: {
    minHeight: 29,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.text,
  },
  seatControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 3,
  },
  seatButton: {
    width: 24,
    height: 25,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  seatButtonText: {
    color: COLORS.white,
    fontSize: 18,
    lineHeight: 21,
    fontWeight: "600",
  },
  seatNumber: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
  },
});