import { Platform } from "react-native";

export function getApiBaseUrl() {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    if (Platform.OS === "web") {
        return "http://localhost:5000";
    }

    if (Platform.OS === "android") {
        return "http://192.168.8.159:5000";
    }

    return "http://192.168.8.159:5000";
}