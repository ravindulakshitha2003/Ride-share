import client from './client';

export async function getMyVehicles() {
  const response = await client.get('/api/vehicles/me');
  return response.data;
}