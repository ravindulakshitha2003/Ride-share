import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  // { origin, destination, distanceKm, durationMinutes, profile, routeSignature, savedAt }
  // Only the signature + summary are stored. No route points.
  const [routeData, setRouteData] = useState(null);

  // Stable identities: RoutePreview won't recalculate in a loop.
  const saveRoute = useCallback((data) => {
    // Same hash = same route, so keep the old object (no extra re-render).
    setRouteData((prev) => (prev?.routeSignature === data.routeSignature ? prev : data));
    console.log("✅ Route signature saved in context:", data.routeSignature);
  }, []);

  const clearRoute = useCallback(() => setRouteData(null), []);

  const value = useMemo(
    () => ({ routeData, saveRoute, clearRoute }),
    [routeData, saveRoute, clearRoute]
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