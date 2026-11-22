import rideClient, { getRideErrorMessage } from './rideClient';
import bookingClient, { getBookingErrorMessage } from './bookingClient';

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
 * Creates a booking request on the booking service (different port from rideClient).
 *
 * The booking service expects:
 *   rideId, requestedSeats, note?, passengerJourney, matchedJourney
 *
 * All the data comes from the search result row passed through from resultsScreen.
 */
export async function bookRideSeat({
  routeId,
  seats,
  driverID,
  // Passenger's chosen search points
  passengerOrigin,       // { name, latitude, longitude }
  passengerDestination,  // { name, latitude, longitude }
  // Nearest points on the driver's route (from PostGIS)
  pickupPoint,           // { name, latitude, longitude }
  dropoffPoint,          // { name, latitude, longitude }
  // Walk distances
  pickupWalkDistanceM = 0,
  dropoffWalkDistanceM = 0,
  note = null,
}) {
  try {
    const payload = {
      rideId: String(routeId),
      driverID : String(driverID),
      requestedSeats: Number(seats),
      note: note || null,
      passengerJourney: {
        origin: {
          name: passengerOrigin.name || 'Origin',
          latitude: Number(passengerOrigin.latitude),
          longitude: Number(passengerOrigin.longitude),
        },
        destination: {
          name: passengerDestination.name || 'Destination',
          latitude: Number(passengerDestination.latitude),
          longitude: Number(passengerDestination.longitude),
        },
      },
      matchedJourney: {
        matchId: String(routeId),
        pickupMode: 'WALK_TO_ROUTE',
        dropoffMode: 'WALK_TO_ROUTE',
        pickupPoint: {
          name: pickupPoint.name || 'Pickup',
          latitude: Number(pickupPoint.latitude),
          longitude: Number(pickupPoint.longitude),
        },
        dropoffPoint: {
          name: dropoffPoint.name || 'Dropoff',
          latitude: Number(dropoffPoint.latitude),
          longitude: Number(dropoffPoint.longitude),
        },
        pickupWalkDistanceM: Math.round(Number(pickupWalkDistanceM)) || 0,
        dropoffWalkDistanceM: Math.round(Number(dropoffWalkDistanceM)) || 0,
        extraDistanceM: 0,
        extraDurationSeconds: 0,
      },
    };

    const response = await bookingClient.post('/api/v1/bookings', payload);

    if (!response.data?.success) {
      throw new Error(response.data?.message || 'Booking failed');
    }

    return response.data.data;
  } catch (error) {
    throw new Error(getBookingErrorMessage(error));
  }
}