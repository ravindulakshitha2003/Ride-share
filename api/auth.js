import client from './client';

// Maps frontend chip display ('Male' -> 'male')
const GENDER_MAP = {
  Male: 'male',
  Female: 'female',
  'Prefer not to say': 'prefer_not_to_say',
};







// Formats React Native image URI into the file format Postman sends
function photoFile(uri) {
  const name = uri.split('/').pop() || 'profile.jpg';
  const ext = (/\.(\w+)$/.exec(name)?.[1] || 'jpg').toLowerCase();
  const type =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  return {
    uri,
    name,
    type,
  };
}

function withPhotoUrl(user) {
  if (!user) return user;
  return { ...user, photoUrl: user.profilePhotoUrl ?? user.photoUrl };
}

export async function registerUser(payload) {
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

  // Exactly matching your successful Postman form-data keys
  formData.append('name', fullName.trim());
  formData.append('mobile', mobile.trim());
  formData.append('email', email.trim().toLowerCase());
  formData.append('password', password);
  formData.append('role', wantsToDrive ? 'driver' : 'passenger');

  if (gender) {
    formData.append('gender', GENDER_MAP[gender] || gender.toLowerCase());
  }

  if (dateOfBirth) {
    formData.append('dateOfBirth', dateOfBirth.trim());
  }

  // Profile photo file
  if (photoUri) {
    formData.append('profilePhoto', photoFile(photoUri));
  }

  let path = '/api/auth/register';

  // If registering as a driver with vehicle
  if (wantsToDrive && driver && vehicle) {
    path = '/api/auth/register-driver';

    formData.append('nicNumber', driver.nicNumber);
    formData.append('drivingLicenceNumber', driver.licenceNumber);
    formData.append('licenceClass', driver.licenceClass);
    formData.append('licenceExpiryDate', driver.licenceExpiry);
    formData.append('address', driver.address);
    formData.append('emergencyContactName', driver.emergencyContact.name);
    formData.append('emergencyContactPhone', driver.emergencyContact.phone);

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
  }

  // Send multipart/form-data
  const res = await client.post(path, formData, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'multipart/form-data',
    },
    transformRequest: (data) => data, // Required in React Native so FormData boundary is preserved
    timeout: 60000,
  });

  return { ...res.data, user: withPhotoUrl(res.data.user) };
}

export async function loginUser({ email, password }) {
  const { data } = await client.post('/api/auth/login', { email, password });
  return data; // { message, user, token }
}

export async function getMe() {
  const { data } = await client.get('/api/auth/me');
  return data.user ?? data;
}