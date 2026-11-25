
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

import client from '../api/client';

// -----------------------------------------------------------------------------
// VEHICLE CONTEXT
// -----------------------------------------------------------------------------
// Uses the existing Axios client.
// The client automatically attaches the JWT token from SecureStore.
//
// Backend endpoint:
// GET http://192.168.8.159:4001/api/vehicles/me
// -----------------------------------------------------------------------------

export const VehicleContext = createContext(null);

// Convert backend vehicle data into a consistent frontend format.
function mapVehicle(vehicle) {
  return {
    id: String(vehicle._id ?? vehicle.id ?? ''),

    name: [vehicle.brand, vehicle.model]
      .filter(Boolean)
      .join(' '),

    brand: vehicle.brand ?? '',
    model: vehicle.model ?? '',

    // Correct field mapping
    plate: vehicle.plateNumber ?? '',
    crNumber: vehicle.crNumber ?? '',

    type: vehicle.vehicleType ?? '',
    seats: vehicle.passengerSeats ?? 0,

    hasAC: Boolean(vehicle.airConditioning),

    year: vehicle.year ?? '',
    color: vehicle.color ?? '',

    photoUrl: vehicle.vehiclePhotoUrl ?? '',

    luggageSpace: vehicle.luggageSpace ?? '',
    description: vehicle.vehicleDescription ?? '',

    revenueLicenceExpiry: vehicle.revenueLicenceExpiry ?? null,
    insuranceExpiry: vehicle.insuranceExpiry ?? null,

    createdAt: vehicle.createdAt ?? null,
    updatedAt: vehicle.updatedAt ?? null,

    // Keep the original backend object for additional details.
    raw: vehicle,
  };
}

// Extract vehicles from the backend response.
function unwrapVehicles(responseData) {
  const payload = responseData?.data ?? responseData;

  const list = Array.isArray(payload)
    ? payload
    : payload?.vehicles ?? [];

  return Array.isArray(list) ? list : [];
}

export function VehicleProvider({ children }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const inFlight = useRef(false);

  // ---------------------------------------------------------------------------
  // FETCH LOGGED-IN USER'S VEHICLES
  // ---------------------------------------------------------------------------

  const fetchVehicles = useCallback(async () => {
    // Prevent duplicate requests while one is already running.
    if (inFlight.current) {
      return;
    }

    inFlight.current = true;
    setLoading(true);
    setError(null);

    try {
      // Axios client automatically adds:
      // Authorization: Bearer <token>
      const response = await client.get('/api/vehicles/me');

      const backendVehicles = unwrapVehicles(response.data);

      const formattedVehicles = backendVehicles.map(mapVehicle);

      setVehicles(formattedVehicles);

      return formattedVehicles;
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Could not load vehicles. Please try again.';

      setError(message);

      console.error('Fetch vehicles error:', err);

      return [];
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // CLEAR VEHICLES
  // ---------------------------------------------------------------------------

  const clearVehicles = useCallback(() => {
    setVehicles([]);
    setError(null);
    setLoading(false);
  }, []);

  // ---------------------------------------------------------------------------
  // REFRESH VEHICLES
  // ---------------------------------------------------------------------------

  const refreshVehicles = useCallback(async () => {
    return await fetchVehicles();
  }, [fetchVehicles]);

  // ---------------------------------------------------------------------------
  // CONTEXT VALUE
  // ---------------------------------------------------------------------------

  const value = useMemo(
    () => ({
      vehicles,
      loading,
      error,

      fetchVehicles,
      refreshVehicles,
      clearVehicles,

      // Convenient value when only one vehicle exists.
      vehicle: vehicles.length > 0 ? vehicles[0] : null,

      // Convenient check for whether a vehicle exists.
      hasVehicle: vehicles.length > 0,
    }),
    [
      vehicles,
      loading,
      error,
      fetchVehicles,
      refreshVehicles,
      clearVehicles,
    ]
  );

  return (
    <VehicleContext.Provider value={value}>
      {children}
    </VehicleContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// CUSTOM HOOK
// -----------------------------------------------------------------------------

export function useVehicle() {
  const context = useContext(VehicleContext);

  if (!context) {
    throw new Error(
      'useVehicle must be used inside a VehicleProvider'
    );
  }

  return context;
}
