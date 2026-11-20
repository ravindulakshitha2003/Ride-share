import { useContext } from "react";
import { VehicleContext } from "../context/VehicleContext";

export default function useVehicles() {
  const ctx = useContext(VehicleContext);
  if (!ctx) throw new Error("useVehicles must be used inside <VehicleProvider>");
  return ctx;
}