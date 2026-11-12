import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  // {
  //   origin: { placeName, latitude, longitude },
  //   destination: { placeName, latitude, longitude },
  //   geometry: { type: "LineString", coordinates: [[lng, lat], ...] },  // straight from OSRM
  //   distanceMeters, durationSeconds,   // straight from OSRM (sent to backend)
  //   distanceKm, durationMinutes,       // for display only
  //   savedAt
  // }
  const [routeData, setRouteData] = useState(null);

  // Stable identities so screens don't re-run effects in a loop.
  const saveRoute = useCallback((data) => {
    setRouteData(data);
    console.log(
      "✅ Route saved in context:",
      data?.geometry?.coordinates?.length,
      "points"
    );
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