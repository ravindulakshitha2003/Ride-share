import rideClient, { getRideErrorMessage } from './rideClient';

/**
 * Searches for matched rides on the route-matching backend (Port 4002).
 * Axios interceptor in `rideClient` automatically retrieves `TOKEN_KEY`
 * from SecureStore and injects `Authorization: Bearer <token>`.
 */
export async function searchAvailableRides({
  pickup,
  dropoff,
  departureDate,
  seats,
  maxDistanceMeters = 5000,
}) {
  try {
    const payload = {
      pickup: {
        latitude: Number(pickup.latitude),
        longitude: Number(pickup.longitude),
      },
      dropoff: {
        latitude: Number(dropoff.latitude),
        longitude: Number(dropoff.longitude),
      },
      departureDate,
      seats: Number(seats),
      maxDistanceMeters: Number(maxDistanceMeters),
    };

    const response = await rideClient.post('/api/v1/route-matching/search', payload);

    if (!response.data || !Array.isArray(response.data.data)) {
      throw new Error('Invalid ride list format received from server.');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(getRideErrorMessage(error));
  }
}

/**
 * Requests or confirms booking seats on a selected route.
 */
export async function bookRideSeat({ routeId, seats, pickupLocation, dropoffLocation }) {
  try {
    const response = await rideClient.post('/api/v1/route-matching/book', {
      routeId,
      seats,
      pickupLocation,
      dropoffLocation,
    });
    return response.data;
  } catch (error) {
    throw new Error(getRideErrorMessage(error));
  }
}