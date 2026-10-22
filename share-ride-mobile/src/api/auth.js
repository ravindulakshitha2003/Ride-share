// Import the shared axios client (it already adds the token header and the server address)
import client from './client';

// Send the registration form (and driver/vehicle details, if any) to the backend
export async function registerUser({
  fullName, mobile, email, password, gender, dateOfBirth, wantsToDrive, driver, vehicle,
}) {
  // POST everything as JSON; driver and vehicle are undefined for passengers, so they are left out
  const res = await client.post('/auth/register', {
    // Account fields from FR-01
    fullName, mobile, email, password, gender, dateOfBirth,
    // True when the user ticked "I want to drive" (FR-07)
    wantsToDrive,
    // Driver details (NIC, licence, address, emergency contact)
    driver,
    // Vehicle details (type, make, model, colour, year, plate, seats and so on)
    vehicle,
  });
  // Return the backend's reply to the screen
  return res.data;
}

// Send the login form to the backend and get back the access token
export async function loginUser({ email, password }) {
  // POST the email and password to the login endpoint
  const res = await client.post('/auth/login', { email, password });
  // Return the reply, expected to look like { token: '...', user: {...} }
  return res.data;
}

// Ask the backend for the profile of the currently logged-in user
export async function getMe() {
  // GET /me; the client attaches the saved token automatically, so no id is needed
  const res = await client.get('/me');
  // Some backends return { user: {...} } and others return the user directly, so handle both
  return res.data.user ?? res.data;
}