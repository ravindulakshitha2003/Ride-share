
import rideClient, {
  getRideErrorMessage,
} from '../api/rideClient';

export async function fetchRideDetails(rideId) {
  try {
    if (!rideId) {
      throw new Error('Ride ID is required.');
    }

    const response = await rideClient.get(
      `/api/v1/route-matching/${rideId}`
    );

    if (!response.data?.success || !response.data?.data) {
      throw new Error('Ride details were not returned by the server.');
    }

    return response.data.data;

  } catch (error) {
    console.error(
      'Fetching ride details failed:',
      error.response?.data || error.message
    );

    throw new Error(getRideErrorMessage(error));
  }
}
