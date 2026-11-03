import { Platform } from "react-native";

// Set EXPO_PUBLIC_API_URL when the development machine's LAN address changes.
export function getApiBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === "web") return "http://localhost:5000";
  //if (Platform.OS === "android") return "http://10.0.2.2:5000";
  if (Platform.OS === "android") return "http://localhost:5000";
  return "http://192.168.1.8:5000";
}
