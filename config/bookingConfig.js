// =============================================================================
// API configuration for the driver app.
//
// IMPORTANT - "localhost" does NOT work on a real phone or on the Android
// emulator, because "localhost" there means the phone itself, not your laptop.
//
//   Real phone with Expo Go  -> use your laptop's Wi-Fi IP, e.g. 192.168.1.25
//                               (Windows: run `ipconfig`, Mac/Linux: `ifconfig`)
//                               Phone and laptop must be on the SAME Wi-Fi.
//   Android emulator         -> http://10.0.2.2:5001
//   iOS simulator / web      -> http://localhost:5001
//
// If your team uses an API gateway, put the gateway URL here instead.
// =============================================================================

// =============================================================================
// Booking service settings (the booking lifecycle backend, port 5004).
//
// The phone must reach your laptop over Wi-Fi, so "localhost" does not work.
// This file finds the laptop's address for you: the same address Expo Go used
// to load the app is the laptop that runs your backends.
//
// If the booking service runs on ANOTHER computer, or you use `expo start --tunnel`,
// type that computer's IP in OVERRIDE_IP below.
// =============================================================================
import Constants from 'expo-constants';

// Example: const OVERRIDE_IP = '192.168.8.159';
const OVERRIDE_IP = null;

// Used when the address cannot be found automatically (same IP as api/client.js).
const FALLBACK_IP = '192.168.1.8';

const BOOKING_PORT = 5001;

// "192.168.8.159:8081" -> "192.168.8.159" (ignored if it is not a plain IPv4 address)
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const expoIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(expoHost ?? '') ? expoHost : null;

export const BOOKING_SERVER_IP = OVERRIDE_IP || expoIp || FALLBACK_IP;

export const API_BASE_URL = `http://${BOOKING_SERVER_IP}:${BOOKING_PORT}/api/v1`;

// TEMPORARY: until the booking service checks the login token, the driver id is
// sent in the "x-driver-id" header. It must be a UUID and must match
// DEV_DRIVER_ID in the booking service .env while the Ride Service is not connected.
export const DEV_DRIVER_ID = '11111111-1111-4111-8111-111111111111';

// How often the Ride Requests screen re-checks for new requests (ms).
export const REQUESTS_POLL_INTERVAL_MS = 10000;

