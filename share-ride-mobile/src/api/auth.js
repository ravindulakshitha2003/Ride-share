// Import the shared axios client (it already adds the token header and the server address)
import client from './client';

// Build the file object that FormData needs from a photo's local path
function photoFile(uri) {
  // Take the file name from the end of the path
  const name = uri.split('/').pop() || 'photo.jpg';
  // Find the extension (jpg, png ...) to choose the file type
  const ext = (/\.(\w+)$/.exec(name)?.[1] || 'jpg').toLowerCase();
  // PNG stays PNG; everything else is sent as JPEG
  return { uri, name, type: ext === 'png' ? 'image/png' : 'image/jpeg' };
}

// Send the registration form (with the optional photo and driver/vehicle details) to the backend
export async function registerUser({
  fullName, mobile, email, password, gender, dateOfBirth, wantsToDrive, driver, vehicle, photoUri,
}) {
  // FormData is the format used to send text fields and a file together
  const formData = new FormData();
  // Add the plain text fields from FR-01
  formData.append('name', fullName);
  formData.append('mobile', mobile);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('gender', gender);
  formData.append('dateOfBirth', dateOfBirth);
  // FormData only carries text, so the true/false switch is sent as the word "true" or "false"
  formData.append('wantsToDrive', String(!!wantsToDrive));
  // Driver details (NIC, licence, address, emergency contact) are sent as JSON text; the backend must JSON.parse them
  if (driver) formData.append('driver', JSON.stringify(driver));
  // Vehicle details (type, make, model, colour, year, plate, seats and so on) are also sent as JSON text
  if (vehicle) formData.append('vehicle', JSON.stringify(vehicle));
  // Attach the photo under the field name "photo" when the user chose one
  if (photoUri) formData.append('photo', photoFile(photoUri));
  // POST everything to the register endpoint; uploads get a longer 30 second timeout
  const res = await client.post('/auth/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
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

// Upload a new profile photo for the logged-in user and return the updated user
export async function uploadProfilePhoto(uri) {
  // FormData is the format used to send files
  const formData = new FormData();
  // Attach the file under the field name "photo" (the backend must read this same name)
  formData.append('photo', photoFile(uri));
  // POST it to the backend; uploads get a longer 30 second timeout
  const res = await client.post('/me/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  // Return the updated user (the backend should include the new photoUrl)
  return res.data.user ?? res.data;
}