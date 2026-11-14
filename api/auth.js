// Calls to the Identity Service (authentication_service).
// Routes: POST /api/auth/register, POST /api/auth/register-driver, POST /api/auth/login,
//         GET /api/auth/me, PUT /api/auth/me
import client from './client';

// true = fake data, no backend needed. false = talk to the real Identity Service.
const DEV_MOCK = false;

// The fake user returned while mock mode is on.
const MOCK_USER = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  mobile: '+94771234567',
  role: 'passenger',
};

// Waits a moment so loading spinners are visible in mock mode.
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The app shows "Male", the backend stores "male".
const GENDER_MAP = {
  Male: 'male',
  Female: 'female',
  'Prefer not to say': 'prefer_not_to_say',
};

// Build the file object that FormData needs from a photo's local path.
function photoFile(uri) {
  const name = uri.split('/').pop() || 'photo.jpg';
  const ext = (/\.(\w+)$/.exec(name)?.[1] || 'jpg').toLowerCase();

  // The backend accepts JPEG, PNG and WebP only.
  const type =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  return { uri, name, type };
}

// The backend calls the picture profilePhotoUrl; the screens read photoUrl.
function withPhotoUrl(user) {
  if (!user) return user;

  return { ...user, photoUrl: user.profilePhotoUrl ?? user.photoUrl };
}

// Create an account. Passengers use /register; drivers use /register-driver,
// which creates the account, the driver details and the vehicle in one request.
// The backend replies { message, user, token }.
export async function registerUser(payload) {
  if (DEV_MOCK) {
    await wait(500);
    return { token: 'mock-token', user: MOCK_USER };
  }

  const {
    fullName,
    mobile,
    email,
    password,
    gender,
    dateOfBirth,
    wantsToDrive,
    driver,
    vehicle,
    photoUri,
    vehiclePhotoUri,
  } = payload;

  const formData = new FormData();

  // Fields every account needs (the backend calls the full name "name").
  formData.append('name', fullName);
  formData.append('mobile', mobile);
  formData.append('email', email);
  formData.append('password', password);

  if (gender) formData.append('gender', GENDER_MAP[gender] ?? gender);
  if (dateOfBirth) formData.append('dateOfBirth', dateOfBirth);

  // The backend reads the profile picture from the field "profilePhoto".
  if (photoUri) formData.append('profilePhoto', photoFile(photoUri));

  let path = '/api/auth/register';

  if (wantsToDrive && driver && vehicle) {
    path = '/api/auth/register-driver';

    // Driver details (flat fields, with the backend's names).
    formData.append('nicNumber', driver.nicNumber);
    formData.append('drivingLicenceNumber', driver.licenceNumber);
    formData.append('licenceClass', driver.licenceClass);
    formData.append('licenceExpiryDate', driver.licenceExpiry);
    formData.append('address', driver.address);
    formData.append('emergencyContactName', driver.emergencyContact.name);
    formData.append('emergencyContactPhone', driver.emergencyContact.phone);

    // Vehicle details (flat fields, with the backend's names).
    formData.append('vehicleType', vehicle.type);
    formData.append('brand', vehicle.make);
    formData.append('model', vehicle.model);
    formData.append('year', String(vehicle.year));
    formData.append('color', vehicle.colour);
    formData.append('crNumber', vehicle.crNumber);
    formData.append('passengerSeats', String(vehicle.seats));
    formData.append('airConditioning', String(!!vehicle.hasAC));
    formData.append('luggageSpace', vehicle.luggage);
    formData.append('vehicleDescription', vehicle.description || '');
    formData.append('revenueLicenceExpiry', vehicle.revenueLicenceExpiry);
    formData.append('insuranceExpiry', vehicle.insuranceExpiry);
    // The backend does not store the number plate yet, so it ignores this for now.
    formData.append('plateNo', vehicle.plateNo);

    if (vehiclePhotoUri) {
      formData.append('vehiclePhoto', photoFile(vehiclePhotoUri));
    }
  } else {
    // /register requires a role; people who did not choose to drive are passengers.
    formData.append('role', 'passenger');
  }

  // Photos are uploaded to Cloudinary by the server, so allow plenty of time.
  const res = await client.post(path, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

  return { ...res.data, user: withPhotoUrl(res.data.user) };
}

// Log in. The backend replies { message, user, token }.
export async function loginUser({ email, password }) {
  if (DEV_MOCK) {
    await wait(500);
    return { token: 'mock-token', user: { ...MOCK_USER, email } };
  }

  const res = await client.post('/api/auth/login', { email, password });

  return { ...res.data, user: withPhotoUrl(res.data.user) };
}

// The profile of the logged-in user. The backend replies { user }.
export async function getMe() {
  if (DEV_MOCK) return MOCK_USER;

  const res = await client.get('/api/auth/me');

  return withPhotoUrl(res.data.user ?? res.data);
}

// Change the logged-in user's profile photo. The backend replies { message, user }.
export async function uploadProfilePhoto(uri) {
  if (DEV_MOCK) {
    await wait(500);
    return { ...MOCK_USER, photoUrl: uri };
  }

  const formData = new FormData();
  formData.append('profilePhoto', photoFile(uri));

  const res = await client.put('/api/auth/me', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

  return withPhotoUrl(res.data.user ?? res.data);
}