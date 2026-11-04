// ─────────────────────────────────────────────────────────────
// PAGE 2: PublishDetailsScreen  (file: Rideinfoscreen.jsx)
// Everything except the map: date, time, seats, price, vehicle.
// Receives the route from PublishRideScreen via params.
// Later, extract: <VehicleSheet />, <VehicleCard />, <VehicleButton />.
// ─────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,

  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import RideDetails from "../components/map/RideDetails";
import PublishButton from "../components/map/PublishButton";
import { COLORS } from "../theme/mapColors";
import { publishRide } from "../api/map/routeApi";
import { SafeAreaView } from 'react-native-safe-area-context';

const BORDER = COLORS.border || "#E5E7EB";

// ── Mock registered vehicles: replace with an API call later ──
const MOCK_VEHICLES = [
  { id: "v1", name: "Toyota Axio", plate: "CAB-1234", type: "car", seats: 4, hasAC: true },
  { id: "v2", name: "Suzuki Alto", plate: "KY-5678", type: "car", seats: 3, hasAC: false },
  { id: "v3", name: "Toyota HiAce", plate: "NB-9012", type: "van", seats: 8, hasAC: true },
  { id: "v4", name: "Honda Vezel", plate: "CBH-3456", type: "suv", seats: 4, hasAC: true },
  { id: "v5", name: "Bajaj RE", plate: "WP-7788", type: "tuk", seats: 2, hasAC: false },
];
const TYPE_ICON = { car: "car-outline", van: "bus-outline", suv: "car-sport-outline", tuk: "bicycle-outline" };

function getDefaultDeparture() {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export default function PublishDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Route chosen on page 1.
  const route = params.route ? JSON.parse(params.route) : null;

  const [defaultDeparture] = useState(getDefaultDeparture);
  const [departureDate, setDepartureDate] = useState(defaultDeparture.date);
  const [departureTime, setDepartureTime] = useState(defaultDeparture.time);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(params.suggestedPrice || "");
  const [vehicle, setVehicle] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  function handleSelectVehicle(v) {
    setVehicle(v);
    setSeats((s) => Math.min(s, v.seats)); // never offer more seats than the vehicle has
    setSheetOpen(false);
  }

  async function handlePublish() {
    if (!route) return Alert.alert("Missing route", "Please go back and choose a route.");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || !/^\d{2}:\d{2}$/.test(departureTime)) {
      return Alert.alert("Invalid date or time", "Use YYYY-MM-DD and HH:MM.");
    }
    if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
      return Alert.alert("Invalid seats", "Choose between 1 and 8 seats.");
    }
    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      return Alert.alert("Invalid price", "Enter a price greater than zero.");
    }
    if (!vehicle) return Alert.alert("No vehicle", "Please choose a vehicle.");

    const rideData = {
      origin: route.origin,
      destination: route.destination,
      departureDate,
      departureTime,
      availableSeats: seats,
      pricePerSeat: numericPrice,
      vehicleId: vehicle.id,
    };

    try {
      const result = await publishRide(rideData);
      Alert.alert("Ride published!", result.message || "Your ride was saved successfully.", [
        { text: "OK", onPress: () => router.replace("/rideDetailsScreen") },
      ]);
    } catch (error) {
      console.error("Publish ride error:", error);
      Alert.alert("Could not publish ride", error.message);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.secondary} />
        </TouchableOpacity>

        <Text style={styles.title}>Ride details</Text>
        <Text style={styles.subtitle}>
          {route ? `${route.origin.placeName} → ${route.destination.placeName}` : "When and how?"}
        </Text>

        <RideDetails
          departureDate={departureDate}
          setDepartureDate={setDepartureDate}
          departureTime={departureTime}
          setDepartureTime={setDepartureTime}
          seats={seats}
          setSeats={setSeats}
          price={price}
          setPrice={setPrice}
        />

        {/* Vehicle picker button + current selection */}
        {vehicle ? <VehicleCard vehicle={vehicle} selected /> : null}
        <TouchableOpacity style={styles.vehicleButton} onPress={() => setSheetOpen(true)}>
          <Ionicons name="car-outline" size={20} color={COLORS.primary} />
          <Text style={styles.vehicleButtonText}>{vehicle ? "Change vehicle" : "Choose vehicle"}</Text>
        </TouchableOpacity>

        <PublishButton onPress={handlePublish} />
      </ScrollView>

      <VehicleSheet
        visible={sheetOpen}
        vehicles={MOCK_VEHICLES}
        selectedId={vehicle?.id}
        onClose={() => setSheetOpen(false)}
        onSelect={handleSelectVehicle}
      />
    </SafeAreaView>
  );
}

// ── Bottom sheet covering 3/4 of the screen. Extract to a component later. ──
function VehicleSheet({ visible, vehicles, selectedId, onClose, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <SafeAreaView style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Choose vehicle</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={COLORS.secondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={vehicles}
            keyExtractor={(v) => v.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<Text style={styles.note}>No registered vehicles.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.7} onPress={() => onSelect(item)}>
                <VehicleCard vehicle={item} selected={item.id === selectedId} />
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ── One vehicle row. Extract to a component later. ──
function VehicleCard({ vehicle, selected }) {
  return (
    <View style={[styles.vehicleCard, selected && styles.vehicleSelected]}>
      <View style={styles.vehicleIcon}>
        <Ionicons name={TYPE_ICON[vehicle.type] || "car-outline"} size={22} color="#fff" />
      </View>
      <View style={styles.flex}>
        <Text style={styles.vehicleName}>{vehicle.name}</Text>
        <Text style={styles.note}>
          {vehicle.plate} · {vehicle.seats} seats{vehicle.hasAC ? " · A/C" : ""}
        </Text>
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingTop: 15, paddingBottom: 120 },
  flex: { flex: 1 },
  back: { marginBottom: 12, alignSelf: "flex-start" },
  title: { fontSize: 25, fontWeight: "800", color: COLORS.secondary },
  subtitle: { fontSize: 13, color: COLORS.muted, marginTop: 4, marginBottom: 19 },
  note: { fontSize: 12, color: COLORS.muted, marginTop: 2 },

  vehicleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginVertical: 12,
  },
  vehicleButtonText: { color: COLORS.primary, fontSize: 15, fontWeight: "600" },

  // Bottom sheet
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    height: "75%",
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, marginBottom: 12 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sheetTitle: { fontSize: 20, fontWeight: "800", color: COLORS.secondary },

  // Vehicle card
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  vehicleSelected: { borderColor: COLORS.primary, borderWidth: 2 },
  vehicleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleName: { fontSize: 16, fontWeight: "600", color: COLORS.secondary },
});