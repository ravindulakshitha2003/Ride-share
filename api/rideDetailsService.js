import client, { TOKEN_KEY } from './client';
import * as SecureStore from 'expo-secure-store';

/**
 * Fetches vehicle and driver details from the authentication/vehicle service (Port 4001).
 *
 * Endpoint: POST /api/drivers/getDriver&Vehical
 * Header: Authorization: Bearer <token>
 * Request Body:
 * {
 *   "driverID": "6af9b5a31a9651d2e0bd4630",
 *   "vehicalID": "6af9b5a31a9651d2e0bd4634"
 * }
 *
 * Expected Response Structure:
 * {
 *   "success": true,
 *   "message": "Vehicle and driver details retrieved successfully",
 *   "data": {
 *     "vehicle": { ... },
 *     "driver": { "verificationStatus": "pending" }
 *   }
 * }
 *
 * @param {string} driverID - Driver's unique ID
 * @param {string} vehicalID - Vehicle's unique ID
 * @returns {Promise<{vehicle: Object, driver: Object}>}
 */
export const getDriverVehicleDetails = async (driverID, vehicalID) => {
  // 1. Validate inputs before triggering network request
  if (!driverID || !vehicalID) {
    throw new Error('Both driverID and vehicalID are required to fetch details.');
  }

  try {
    // 2. Retrieve the stored JWT token to guarantee Bearer authentication
    const token = await SecureStore.getItemAsync(TOKEN_KEY);

    // 3. Make POST request with payload and Bearer token header
    const response = await client.post(
      '/api/drivers/getDriver&Vehical',
      {
        driverID: String(driverID).trim(),
        vehicalID: String(vehicalID).trim(),
      },
      {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : {},
      }
    );

    // 4. Validate response payload
    if (!response.data || !response.data.data) {
      throw new Error(
        response.data?.message || 'Unable to retrieve driver and vehicle details.'
      );
    }

    return response.data.data;
  } catch (error) {
    // 5. Extract user-friendly error message from server response if available
    const serverMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'Unable to load driver and vehicle details.';

    console.error('getDriverVehicleDetails error:', serverMessage);
    throw new Error(serverMessage);
  }
};

export default getDriverVehicleDetails;