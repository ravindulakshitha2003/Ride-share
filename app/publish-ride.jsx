
import React, { useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { setMapPickerSelectionHandler } from "../context/mapNavigation";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  Alert,
  StyleSheet,
} from "react-native";

import Header from "../components/map/Header";
import LocationCard from "../components/map/LocationCard";
import RideDetails from "../components/map/RideDetails";
//import RoutePreview from "../components/map/RoutePreview";
import RoutePreview from "../components/map/route/RoutePreview";
import PublishButton from "../components/map/PublishButton";
import { COLORS } from "../theme/mapColors";
import { publishRide } from "../api/map/routeApi";
function getDefaultDeparture() {
  const departure = new Date();
  departure.setHours(departure.getHours() + 1, 0, 0, 0);
  const date = `${departure.getFullYear()}-${String(departure.getMonth() + 1).padStart(2, "0")}-${String(departure.getDate()).padStart(2, "0")}`;
  const time = `${String(departure.getHours()).padStart(2, "0")}:${String(departure.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

export default function PublishRideScreen() {
  const router = useRouter();
  const [origin, setOrigin] = useState("Jaffna");
  const [destination, setDestination] = useState("Vavuniya");

  const [originCoordinates, setOriginCoordinates] = useState({
    latitude: 9.6615,
    longitude: 80.0255,
  });

  const [destinationCoordinates, setDestinationCoordinates] = useState({
    latitude: 8.7514,
    longitude: 80.4971,
  });
  

  const [defaultDeparture] = useState(getDefaultDeparture);
  const [departureDate, setDepartureDate] = useState(defaultDeparture.date);
  const [departureTime, setDepartureTime] = useState(defaultDeparture.time);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState("");

  const PRICE_PER_KM = 10;

const handleRouteCalculated = useCallback(({ distanceKm }) => {
  const suggestedPrice =
    Math.round((distanceKm * PRICE_PER_KM) / 50) * 50;

  setPrice(String(suggestedPrice));
}, []);

  function openMapPicker(type) {
    const isOrigin = type === "origin";
    setMapPickerSelectionHandler((location) => {
      if (isOrigin) {
        setOriginCoordinates(location);
        setOrigin(location.placeName || `Selected location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`);
      } else {
        setDestinationCoordinates(location);
        setDestination(location.placeName || `Selected location (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`);
      }
    });
    const initial = isOrigin ? originCoordinates : destinationCoordinates;
    router.push({
      pathname: "/map-picker",
      params: {
        latitude: String(initial?.latitude ?? 9.6615),
        longitude: String(initial?.longitude ?? 80.0255),
        placeName: isOrigin ? origin : destination,
      },
    });
  }

  function swapLocations() {
    setOrigin(destination);
    setDestination(origin);

    setOriginCoordinates(destinationCoordinates);
    setDestinationCoordinates(originCoordinates);
  }

  
async function handlePublish() {
  console.log("handlePublish started");

  if (!origin.trim() || !destination.trim()) {
    Alert.alert("Missing location", "Choose both pickup and destination.");
    return;
  }

  if (!originCoordinates || !destinationCoordinates) {
    Alert.alert(
      "Choose locations on the map",
      "Please select both pickup and destination using the map buttons."
    );
    return;
  }

  const sameLocation =
    originCoordinates.latitude === destinationCoordinates.latitude &&
    originCoordinates.longitude === destinationCoordinates.longitude;

  if (sameLocation) {
    Alert.alert("Invalid route", "Choose two different locations.");
    return;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) ||
    !/^\d{2}:\d{2}$/.test(departureTime)
  ) {
    Alert.alert("Invalid date or time", "Use YYYY-MM-DD and HH:MM.");
    return;
  }

  if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
    Alert.alert("Invalid seats", "Choose between 1 and 8 seats.");
    return;
  }

  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    Alert.alert("Invalid price", "Enter a price greater than zero.");
    return;
  }

  const rideData = {
    origin: {
      placeName: origin.trim(),
      latitude: originCoordinates.latitude,
      longitude: originCoordinates.longitude,
    },
    destination: {
      placeName: destination.trim(),
      latitude: destinationCoordinates.latitude,
      longitude: destinationCoordinates.longitude,
    },
    departureDate,
    departureTime,
    availableSeats: seats,
    pricePerSeat: numericPrice,
  };

  console.log("Publishing ride data:", JSON.stringify(rideData));

  try {
    const result = await publishRide(rideData);
    console.log("Publish response:", result);

    Alert.alert(
      "Ride published!",
      result.message || "Your ride was saved successfully."
    );
  } catch (error) {
    console.error("Publish ride error:", error);
    Alert.alert("Could not publish ride", error.message);
  }
}


  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Header
          onProfilePress={() =>
            Alert.alert("Driver profile", "Profile options")
          }
        />

        <Text style={styles.title}>Publish a ride</Text>
        <Text style={styles.subtitle}>
          Share your journey with passengers
        </Text>

        <LocationCard
          origin={origin}
          setOrigin={(value) => {
            setOrigin(value);
            setOriginCoordinates(null);
          }}
          destination={destination}
          setDestination={(value) => {
            setDestination(value);
            setDestinationCoordinates(null);
          }}
          onPickOrigin={() => openMapPicker("origin")}
          onPickDestination={() => openMapPicker("destination")}
          onSwap={swapLocations}
        />

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

       <RoutePreview
          origin={origin}
          destination={destination}
          originCoordinates={originCoordinates}
          destinationCoordinates={destinationCoordinates}
          onRouteCalculated={handleRouteCalculated}
        />

        <PublishButton onPress={handlePublish} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
  flexGrow: 1,
  paddingHorizontal: 18,
  paddingTop: 15,
  paddingBottom: 30,
},
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: COLORS.secondary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
    marginBottom: 19,
  },
});
