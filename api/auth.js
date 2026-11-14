// Calls to the Identity Service (authentication_service).
import client from './client';

const DEV_MOCK = false;

const MOCK_USER = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  mobile: '+94771234567',
  role: 'passenger',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const GENDER_MAP = {
  Male: 'male',
  Female: 'female',
  'Prefer not to say': 'prefer_not_to_say',
};

// Build the file object required by React Native FormData
function photoFile(uri) {
  const name = uri.split('/').pop() || 'photo.jpg';
  const ext = (/\.(\w+)$/.exec(name)?.[1] || 'jpg').toLowerCase();

  const type =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  return { uri, name, type };
}

function withPhotoUrl(user) {
  if (!user) return user;
  return { ...user, photoUrl: user.profilePhotoUrl ?? user.photoUrl };
}

// ---------------------------------------------------------------------------
// 1. Register User (Passenger or Driver + Vehicle)
// ---------------------------------------------------------------------------
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

  // Basic User fields
  formData.append('name', fullName);
  formData.append('mobile', mobile);
  formData.append('email', email);
  formData.append('password', password);

  if (gender) formData.append('gender', GENDER_MAP[gender] ?? gender);
  if (dateOfBirth) formData.append('dateOfBirth', dateOfBirth);
  if (photoUri) formData.append('profilePhoto', photoFile(photoUri));

  let path = '/api/auth/register';

  if (wantsToDrive && driver && vehicle) {
    path = '/api/auth/register-driver';

    // Driver details
    formData.append('nicNumber', driver.nicNumber);
    formData.append('drivingLicenceNumber', driver.licenceNumber);
    formData.append('licenceClass', driver.licenceClass);
    formData.append('licenceExpiryDate', driver.licenceExpiry);
    formData.append('address', driver.address);
    formData.append('emergencyContactName', driver.emergencyContact.name);
    formData.append('emergencyContactPhone', driver.emergencyContact.phone);

    // Vehicle details
    formData.append('vehicleType', String(vehicle.type).toLowerCase());
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

    if (vehiclePhotoUri) {
      formData.append('vehiclePhoto', photoFile(vehiclePhotoUri));
    }
  } else {
    formData.append('role', 'passenger');
  }

  const res = await client.post(path, formData, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data, // Preserves boundary in React Native
  });

  return { ...res.data, user: withPhotoUrl(res.data.user) };
}

// ---------------------------------------------------------------------------
// 2. Login User
// ---------------------------------------------------------------------------
export async function loginUser({ email, password }) {
  if (DEV_MOCK) {
    await wait(500);
    return { token: 'mock-token', user: { ...MOCK_USER, email } };
  }

  const res = await client.post('/api/auth/login', { email, password });

  return { ...res.data, user: withPhotoUrl(res.data.user) };
}

// ---------------------------------------------------------------------------
// 3. Get Authenticated User Profile
// ---------------------------------------------------------------------------
export async function getMe() {
  if (DEV_MOCK) return MOCK_USER;

  const res = await client.get('/api/auth/me');

  return withPhotoUrl(res.data.user ?? res.data);
}

// ---------------------------------------------------------------------------
// 4. Update Profile Photo
// ---------------------------------------------------------------------------
export async function uploadProfilePhoto(uri) {
  if (DEV_MOCK) {
    await wait(500);
    return { ...MOCK_USER, photoUrl: uri };
  }

  const formData = new FormData();
  formData.append('profilePhoto', photoFile(uri));

  const res = await client.put('/api/auth/me', formData, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data,
  });

  return withPhotoUrl(res.data.user ?? res.data);
}