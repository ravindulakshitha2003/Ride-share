import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [routeData, setRouteData] = useState(null);
  const [rideDetails, setRideDetails] = useState(null);
  const [rideOptions, setRideOptions] = useState(null);

  // A new route invalidates ride details and preferences from the old route.
  const saveRoute = useCallback((data) => {
    setRouteData(data);
    setRideDetails(null);
    setRideOptions(null);
    console.log("✅ Route saved in context:", data?.geometry?.coordinates?.length, "points");
  }, []);

  const saveRideDetails = useCallback((data) => {
    setRideDetails(data);
    console.log("✅ Ride details saved in context");
  }, []);

  const saveRideOptions = useCallback((data) => {
    setRideOptions(data);
    console.log("✅ Ride preferences saved in context");
  }, []);

  // Keep the existing function name, but clear the complete publishing flow.
  const clearRoute = useCallback(() => {
    setRouteData(null);
    setRideDetails(null);
    setRideOptions(null);
  }, []);

  const value = useMemo(
    () => ({
      routeData,
      rideDetails,
      rideOptions,
      saveRoute,
      saveRideDetails,
      saveRideOptions,
      clearRoute,
    }),
    [
      routeData,
      rideDetails,
      rideOptions,
      saveRoute,
      saveRideDetails,
      saveRideOptions,
      clearRoute,
    ]
  );

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useRoute() {
  const context = useContext(RouteContext);

  if (!context) {
    throw new Error("useRoute must be used inside RouteProvider");
  }

  return context;
}
