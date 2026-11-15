import React, { createContext, useCallback, useMemo, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { TOKEN_KEY } from "../api/client"; // same key AuthContext saves the token under

// Vehicles are on the ride service (4002), not auth (4001)
const API_BASE = "http://192.168.8.159:4001";

// Backend doc -> shape the UI uses
function mapVehicle(v) {
  return {
    id: String(v._id ?? v.id),
    name: [v.brand, v.model].filter(Boolean).join(" "),
    plate: v.crNumber,
    type: v.vehicleType,
    seats: v.passengerSeats,
    hasAC: !!v.airConditioning,
    year: v.year,
    color: v.color,
    photoUrl: v.vehiclePhotoUrl,
    raw: v,
  };
}

// Handles [..], { data: [..] }, { data: { vehicles: [..] } }, { vehicles: [..] }
function unwrap(json) {
  const list = Array.isArray(json)
    ? json
    : json?.data?.vehicles ?? json?.data ?? json?.vehicles ?? [];
  return Array.isArray(list) ? list : [list];
}

export const VehicleContext = createContext(null);

export function VehicleProvider({ children }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(false);

  const fetchVehicles = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) throw new Error("Not logged in. Please log in again.");

      const res = await fetch(`${API_BASE}/api/vehicles/me`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || `Server error ${res.status}`);

      setVehicles(unwrap(json).map(mapVehicle));
    } catch (e) {
      setError(e.message || "Could not load vehicles");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  const value = useMemo(
    () => ({ vehicles, loading, error, fetchVehicles }),
    [vehicles, loading, error, fetchVehicles]
  );

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
}