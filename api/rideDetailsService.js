import client from './client';

export const getDriverVehicleDetails = async (driverID, vehicalID) => {
  try {
    const response = await client.post('/api/drivers/getDriver&Vehical', {
      driverID,
      vehicalID,
    });

    if (!response.data?.success || !response.data?.data) {
      throw new Error(
        response.data?.message || 'Unable to load driver and vehicle details.'
      );
    }

    return response.data.data;
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Unable to load driver and vehicle details.';

    throw new Error(message);
  }
};