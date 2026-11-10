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

  // Stable functions: they keep the same identity between renders,
  // which prevents RoutePreview from recalculating in a loop.
  const saveRoute = useCallback((data) => setRouteData(data), []);
  const clearRoute = useCallback(() => setRouteData(null), []);

  const value = useMemo(
    () => ({ routeData, saveRoute, clearRoute }),
    [routeData, saveRoute, clearRoute]
  );

  return (
    <RouteContext.Provider value={value}>{children}</RouteContext.Provider>
  );
}

export function useRoute() {
  const context = useContext(RouteContext);

  if (!context) {
    throw new Error("useRoute must be used inside RouteProvider");
  }

  return context;
}