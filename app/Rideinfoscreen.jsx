// PAGE 2: PublishDetailsScreen (file: Rideinfoscreen.jsx)
// Reads the selected route (all points) from RouteContext, collects ride info,
// and sends everything to the backend.
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
import { SafeAreaView } from "react-native-safe-area-context";

import RideDetails from "../components/map/RideDetails";
import PublishButton from "../components/map/PublishButton";
import { useRoute } from "../context/RouteContext";

// Physical phone: your PC's LAN IP (same Wi-Fi, port 5002 allowed in Windows Firewall).
// Android emulator: http://10.0.2.2:5002
const API_URL = "http://192.168.8.159:4002/api/v1/route-matching/publish";
const SEND_TO_BACKEND = true; // false = only log the payload summary

async function publishRideToBackend(payload) {
  if (!SEND_TO_BACKEND) {
    console.log(
      "📦 PAYLOAD (not sent). Route points:",
      payload.geometry.coordinates.length
    );
    return { status: "not sent" };
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.message || `Server error ${res.status}`);
  return json;
}

// Indigo & Violet theme
const THEME = {
  primary: "#5B4BDB",
  secondary: "#312E81",
  accent: "#F0ABFC",
  background: "#F8F7FF",
  text: "#24213B",
  white: "#FFFFFF",
  muted: "#85819B",
  border: "#E8E5F2",
  overlay: "rgba(36, 33, 59, 0.55)",
  lightPrimary: "#EEECFF",
};

// Two example vehicles
const MOCK_VEHICLES = [
  { id: "v1", name: "Toyota Axio", plate: "CAB-1234", type: "car", seats: 4, hasAC: true },
  { id: "v2", name: "Suzuki Alto", plate: "KY-5678", type: "car", seats: 3, hasAC: false },
];

const TYPE_ICON = {
  car: "car-outline",
  van: "bus-outline",
  suv: "car-sport-outline",
  tuk: "bicycle-outline",
};

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
  const { routeData, clearRoute } = useRoute();

  const [defaultDeparture] = useState(getDefaultDeparture);
  const [departureDate, setDepartureDate] = useState(defaultDeparture.date);
  const [departureTime, setDepartureTime] = useState(defaultDeparture.time);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(params.suggestedPrice || "");
  const [vehicle, setVehicle] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  function handleSelectVehicle(v) {
    setVehicle(v);
    setSeats((s) => Math.min(s, v.seats));
    setSheetOpen(false);
  }

  function handleAddVehicle() {
    setSheetOpen(false);
    // push (not replace) so the user can come back and keep this form.
    router.push("./Addvehical");
  }

  async function handlePublish() {
    if (publishing) return;

    if (!routeData?.geometry?.coordinates?.length) {
      return Alert.alert("Missing route", "Please go back and choose a route.");
    }
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
    if (!vehicle) {
      return Alert.alert("No vehicle", "Please choose a vehicle.");
    }

    const rideData = {
      vehicleId: vehicle.id,
      origin: routeData.origin,
      destination: routeData.destination,
      geometry: routeData.geometry, // GeoJSON LineString, all OSRM points
      distanceMeters: routeData.distanceMeters,
      durationSeconds: routeData.durationSeconds,
      departureDate,
      departureTime,
      availableSeats: seats,
      pricePerSeat: numericPrice,
    };

    try {
      setPublishing(true);
      const result = await publishRideToBackend(rideData);
      console.log("✅ Published:", result?.data?.route_id ?? result?.status);

      Alert.alert("Ride published!", "Your ride is now live.", [
        {
          text: "OK",
          onPress: () => {
            clearRoute();
            router.replace("/rideDetailsScreen");
          },
        },
      ]);
    } catch (error) {
      console.error("Publish ride error:", error);
      Alert.alert("Could not publish ride", error.message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={THEME.background} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={THEME.secondary} />
        </TouchableOpacity>

        {/* Page heading */}
        <Text style={styles.title}>Ride details</Text>
        <Text style={styles.subtitle}>
          {routeData
            ? `${routeData.origin.placeName} → ${routeData.destination.placeName}`
            : "When and how?"}
        </Text>

        {/* Date, time, seats and price */}
        <View style={styles.detailsContainer}>
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
        </View>

        {/* Selected vehicle */}
        <View style={styles.vehicleSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Your vehicle</Text>
              <Text style={styles.sectionSubtitle}>Choose the vehicle for this ride</Text>
            </View>

            <View style={styles.carBadge}>
              <Ionicons name="car-outline" size={18} color={THEME.primary} />
            </View>
          </View>

          {vehicle ? (
            <VehicleCard vehicle={vehicle} selected />
          ) : (
            <View style={styles.emptyVehicle}>
              <View style={styles.emptyIcon}>
                <Ionicons name="car-sport-outline" size={30} color={THEME.primary} />
              </View>
              <Text style={styles.emptyTitle}>No vehicle selected</Text>
              <Text style={styles.emptyText}>Select a registered vehicle to continue.</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.vehicleButton}
            onPress={() => setSheetOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={vehicle ? "swap-horizontal" : "add-circle-outline"}
              size={20}
              color={THEME.white}
            />
            <Text style={styles.vehicleButtonText}>
              {vehicle ? "Change vehicle" : "Choose vehicle"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Publish */}
        <PublishButton onPress={handlePublish} />
      </ScrollView>

      {/* Vehicle selection modal */}
      <VehicleSheet
        visible={sheetOpen}
        vehicles={MOCK_VEHICLES}
        selectedId={vehicle?.id}
        onClose={() => setSheetOpen(false)}
        onSelect={handleSelectVehicle}
        onAddVehicle={handleAddVehicle}
      />
    </SafeAreaView>
  );
}

// =====================================
// VEHICLE SELECTION BOTTOM SHEET
// =====================================

function VehicleSheet({ visible, vehicles, selectedId, onClose, onSelect, onAddVehicle }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Dark transparent background */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Bottom sheet */}
        <SafeAreaView style={styles.sheet} edges={["bottom"]}>
          <View style={styles.handle} />

          {/* Sheet heading */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeadingContent}>
              <Text style={styles.sheetTitle}>My Vehicles</Text>
              <Text style={styles.sheetSubtitle}>Select a vehicle for your ride</Text>
            </View>

            {/* Add vehicle button */}
            <TouchableOpacity
              style={styles.addVehicleButton}
              onPress={onAddVehicle}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color={THEME.white} />
              <Text style={styles.addVehicleText}>Add Vehicle</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.listLabel}>
            <Text style={styles.listLabelText}>REGISTERED VEHICLES</Text>
            <Text style={styles.vehicleCount}>{vehicles.length}</Text>
          </View>

          <FlatList
            data={vehicles}
            keyExtractor={(v) => v.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.vehicleList}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Ionicons name="car-outline" size={40} color={THEME.muted} />
                <Text style={styles.emptyTitle}>No registered vehicles</Text>
                <Text style={styles.emptyText}>Add your vehicle to publish a ride.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity activeOpacity={0.8} onPress={() => onSelect(item)}>
                <VehicleCard vehicle={item} selected={item.id === selectedId} />
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// =====================================
// VEHICLE CARD
// =====================================

function VehicleCard({ vehicle, selected }) {
  return (
    <View style={[styles.vehicleCard, selected && styles.vehicleSelected]}>
      <View style={[styles.vehicleIcon, selected && styles.vehicleIconSelected]}>
        <Ionicons
          name={TYPE_ICON[vehicle.type] || "car-outline"}
          size={25}
          color={selected ? THEME.white : THEME.primary}
        />
      </View>

      <View style={styles.vehicleInfo}>
        <Text style={styles.vehicleName}>{vehicle.name}</Text>
        <Text style={styles.vehiclePlate}>{vehicle.plate}</Text>

        <View style={styles.vehicleMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={THEME.muted} />
            <Text style={styles.metaText}>{vehicle.seats} seats</Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="snow-outline" size={14} color={THEME.muted} />
            <Text style={styles.metaText}>{vehicle.hasAC ? "A/C" : "Non A/C"}</Text>
          </View>
        </View>
      </View>

      {selected ? (
        <Ionicons name="checkmark-circle" size={24} color={THEME.primary} />
      ) : (
        <View style={styles.unselectedCircle} />
      )}
    </View>
  );
}

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: THEME.background },

  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },

  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 27,
    fontWeight: "800",
    color: THEME.text,
    letterSpacing: -0.6,
  },

  subtitle: {
    fontSize: 13,
    color: THEME.muted,
    marginTop: 6,
    marginBottom: 24,
  },

  detailsContainer: {
    backgroundColor: THEME.white,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    marginBottom: 24,
  },

  vehicleSection: { marginBottom: 24 },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionTitle: { fontSize: 19, fontWeight: "800", color: THEME.text },
  sectionSubtitle: { fontSize: 12, color: THEME.muted, marginTop: 4 },

  carBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.lightPrimary,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyVehicle: {
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    borderStyle: "dashed",
    borderRadius: 18,
    alignItems: "center",
    padding: 22,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: THEME.lightPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: { fontSize: 15, fontWeight: "700", color: THEME.text, marginTop: 8 },
  emptyText: { fontSize: 12, color: THEME.muted, marginTop: 5, textAlign: "center" },

  vehicleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
    borderRadius: 15,
    paddingVertical: 15,
    marginTop: 14,
    gap: 9,
  },

  vehicleButtonText: { fontSize: 14, fontWeight: "700", color: THEME.white },

  // Modal overlay
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "transparent" },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: THEME.overlay,
  },

  // Bottom sheet
  sheet: {
    height: "72%",
    backgroundColor: THEME.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    overflow: "hidden",
  },

  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 10,
    backgroundColor: "#D6D1E8",
    marginBottom: 22,
  },

  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 25,
  },

  sheetHeadingContent: { flex: 1 },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: THEME.text },
  sheetSubtitle: { fontSize: 12, color: THEME.muted, marginTop: 5 },

  addVehicleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.primary,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 11,
    gap: 3,
  },

  addVehicleText: { color: THEME.white, fontSize: 12, fontWeight: "700" },

  listLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  listLabelText: {
    color: THEME.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  vehicleCount: {
    color: THEME.primary,
    backgroundColor: THEME.lightPrimary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    fontSize: 11,
    fontWeight: "800",
  },

  vehicleList: { paddingBottom: 12 },

  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: THEME.border,
    gap: 13,
  },

  vehicleSelected: { borderColor: THEME.primary, backgroundColor: "#F4F2FF" },

  vehicleIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: THEME.lightPrimary,
    alignItems: "center",
    justifyContent: "center",
  },

  vehicleIconSelected: { backgroundColor: THEME.primary },

  vehicleInfo: { flex: 1 },
  vehicleName: { fontSize: 15, fontWeight: "800", color: THEME.text },
  vehiclePlate: { fontSize: 12, color: THEME.muted, marginTop: 3 },

  vehicleMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 9,
  },

  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: THEME.muted, fontWeight: "500" },

  unselectedCircle: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: THEME.border,
  },

  emptyList: { alignItems: "center", paddingVertical: 35 },

  cancelButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    backgroundColor: THEME.white,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 5,
    marginBottom: 8,
  },

  cancelText: { color: THEME.secondary, fontSize: 14, fontWeight: "700" },
});