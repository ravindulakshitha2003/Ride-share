
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import useAuth from '../../hooks/useAuth';
import { getErrorMessage } from '../../api/client';
import { Field } from '../../components/Field';

// Validate a YYYY-MM-DD date without accepting impossible dates.
function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

// Reusable selectable options.
function Chips({ label, options, value, onChange, error }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.chipRow}>
        {options.map((option) => {
          const selected = value === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, selected && styles.chipActive]}
              onPress={() => onChange(option.value)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.chipText,
                  selected && styles.chipTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const GENDERS = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Prefer not to say', value: 'Prefer not to say' },
];

const VEHICLE_TYPES = [
  { label: 'Car', value: 'Car' },
  { label: 'Van', value: 'Van' },
  { label: 'SUV', value: 'SUV' },
  { label: 'Other', value: 'Other' },
];

const LUGGAGE_OPTIONS = [
  { label: 'Available', value: 'available' },
  { label: 'Limited', value: 'limited' },
  { label: 'Unavailable', value: 'unavailable' },
];

const EMPTY_FORM = {
  fullName: '',
  mobile: '+94',
  email: '',
  password: '',
  confirmPassword: '',
  gender: '',
  dateOfBirth: '',

  wantsToDrive: false,

  nicNumber: '',
  licenceNumber: '',
  licenceClass: '',
  licenceExpiry: '',
  address: '',
  emergencyName: '',
  emergencyPhone: '+94',

  vehicleType: '',
  make: '',
  model: '',
  colour: '',
  year: '',
  plateNo: '',
  seats: '',
  hasAC: false,
  luggage: '',
  description: '',
  crNumber: '',
  revenueLicenceExpiry: '',
  insuranceExpiry: '',
};

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [vehiclePhotoUri, setVehiclePhotoUri] = useState(null);

  // Update one form field.
  const set = (key) => (value) => {
    setForm((current) => ({ ...current, [key]: value }));

    setErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
  };

  // Select a profile photo from the camera or gallery.
  async function pickPhoto(fromCamera) {
    try {
      if (fromCamera) {
        const permission =
          await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          setFormError('Camera permission is required to take a photo.');
          return;
        }
      }

      const options = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      };

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            ...options,
            cameraType: ImagePicker.CameraType.front,
          })
        : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets?.length) return;

      setPhotoUri(result.assets[0].uri);
      setFormError('');
      setErrors((current) => ({ ...current, photo: undefined }));
    } catch (error) {
      setFormError('Unable to open the photo picker. Please try again.');
    }
  }

  function choosePhotoSource() {
    const buttons = [
      {
        text: 'Take a selfie',
        onPress: () => pickPhoto(true),
      },
      {
        text: 'Choose from gallery',
        onPress: () => pickPhoto(false),
      },
    ];

    if (photoUri) {
      buttons.push({
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => setPhotoUri(null),
      });
    }

    buttons.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      'Profile photo',
      'Choose a clear photo of your face.',
      buttons
    );
  }

  // Select a vehicle photo from the camera or gallery.
  async function pickVehiclePhoto(fromCamera) {
    try {
      if (fromCamera) {
        const permission =
          await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          setFormError('Camera permission is required to take a photo.');
          return;
        }
      }

      const options = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      };

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets?.length) return;

      setVehiclePhotoUri(result.assets[0].uri);
      setFormError('');
      setErrors((current) => ({
        ...current,
        vehiclePhoto: undefined,
      }));
    } catch (error) {
      setFormError('Unable to open the photo picker. Please try again.');
    }
  }

  function chooseVehiclePhotoSource() {
    Alert.alert(
      'Vehicle photo',
      'Choose a clear photo showing the vehicle and its number plate.',
      [
        {
          text: 'Take a photo',
          onPress: () => pickVehiclePhoto(true),
        },
        {
          text: 'Choose from gallery',
          onPress: () => pickVehiclePhoto(false),
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  // Validate account details and, when applicable, driver details.
  function validate() {
    const error = {};
    const value = (key) => String(form[key] ?? '').trim();

    if (!value('fullName')) {
      error.fullName = 'Full name is required.';
    }

    if (!/^\+94\d{9}$/.test(value('mobile'))) {
      error.mobile = 'Use the format +94771234567.';
    }

    if (!value('email')) {
      error.email = 'Email is required.';
    } else if (!/^\S+@\S+\.\S+$/.test(value('email'))) {
      error.email = 'Enter a valid email address.';
    }

    if (form.password.length < 8) {
      error.password = 'Password must be at least 8 characters.';
    }

    if (form.confirmPassword !== form.password) {
      error.confirmPassword = 'Passwords do not match.';
    }

    if (!form.gender) {
      error.gender = 'Please choose an option.';
    }

    const dob = parseDate(value('dateOfBirth'));
    const today = new Date();
    const minimumAgeDate = new Date(
      today.getFullYear() - 18,
      today.getMonth(),
      today.getDate()
    );

    if (!dob) {
      error.dateOfBirth = 'Use a valid date in YYYY-MM-DD format.';
    } else if (dob > minimumAgeDate) {
      error.dateOfBirth = 'You must be at least 18 years old.';
    }

    if (!photoUri) {
      error.photo = 'Please add a profile photo.';
    }

    if (form.wantsToDrive) {
      if (!/^(\d{9}[VvXx]|\d{12})$/.test(value('nicNumber'))) {
        error.nicNumber = 'Enter 9 digits + V/X, or 12 digits.';
      }

      if (!value('licenceNumber')) {
        error.licenceNumber = 'Licence number is required.';
      }

      if (!value('licenceClass')) {
        error.licenceClass = 'Licence class is required.';
      }

      const licenceExpiry = parseDate(value('licenceExpiry'));

      if (!licenceExpiry) {
        error.licenceExpiry = 'Use a valid YYYY-MM-DD date.';
      } else if (licenceExpiry <= today) {
        error.licenceExpiry = 'This licence has expired.';
      }

      if (!value('address')) {
        error.address = 'Address is required.';
      }

      if (!value('emergencyName')) {
        error.emergencyName = 'Emergency contact name is required.';
      }

      if (!/^\+94\d{9}$/.test(value('emergencyPhone'))) {
        error.emergencyPhone = 'Use the format +94771234567.';
      }

      if (!form.vehicleType) {
        error.vehicleType = 'Please choose a vehicle type.';
      }

      if (!value('make')) {
        error.make = 'Vehicle brand is required.';
      }

      if (!value('model')) {
        error.model = 'Vehicle model is required.';
      }

      if (!value('colour')) {
        error.colour = 'Vehicle colour is required.';
      }

      if (!value('description')) {
        error.description = 'Vehicle description is required.';
      }

      const year = Number(value('year'));

      if (
        !Number.isInteger(year) ||
        year < 1990 ||
        year > today.getFullYear() + 1
      ) {
        error.year = 'Enter a valid vehicle year.';
      }

      if (!value('plateNo')) {
        error.plateNo = 'Number plate is required.';
      }

      const seats = Number(value('seats'));

      if (!Number.isInteger(seats) || seats < 1 || seats > 8) {
        error.seats = 'Enter passenger seats from 1 to 8.';
      }

      if (!form.luggage) {
        error.luggage = 'Please choose a luggage option.';
      }

      if (!value('crNumber')) {
        error.crNumber = 'Registration (CR) number is required.';
      }

      const revenueExpiry = parseDate(value('revenueLicenceExpiry'));

      if (!revenueExpiry) {
        error.revenueLicenceExpiry = 'Use a valid YYYY-MM-DD date.';
      } else if (revenueExpiry <= today) {
        error.revenueLicenceExpiry = 'Revenue licence has expired.';
      }

      const insuranceExpiry = parseDate(value('insuranceExpiry'));

      if (!insuranceExpiry) {
        error.insuranceExpiry = 'Use a valid YYYY-MM-DD date.';
      } else if (insuranceExpiry <= today) {
        error.insuranceExpiry = 'Insurance has expired.';
      }

      if (!vehiclePhotoUri) {
        error.vehiclePhoto = 'Please add a vehicle photo.';
      }
    }

    return error;
  }

  // Submit the registration form.
  async function handleRegister() {
    if (submitting) return;

    setFormError('');

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      setFormError('Please fix the highlighted fields.');
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth.trim(),
      wantsToDrive: form.wantsToDrive,
      photoUri,
    };

    if (form.wantsToDrive) {
      payload.vehiclePhotoUri = vehiclePhotoUri;

      payload.driver = {
        nicNumber: form.nicNumber.trim().toUpperCase(),
        licenceNumber: form.licenceNumber.trim(),
        licenceClass: form.licenceClass.trim().toUpperCase(),
        licenceExpiry: form.licenceExpiry.trim(),
        address: form.address.trim(),
        emergencyContact: {
          name: form.emergencyName.trim(),
          phone: form.emergencyPhone.trim(),
        },
      };

      payload.vehicle = {
        type: form.vehicleType,
        make: form.make.trim(),
        model: form.model.trim(),
        colour: form.colour.trim(),
        year: Number(form.year),
        plateNo: form.plateNo.trim().toUpperCase(),
        seats: Number(form.seats),
        hasAC: form.hasAC,
        luggage: form.luggage,
        description: form.description.trim(),
        crNumber: form.crNumber.trim(),
        revenueLicenceExpiry: form.revenueLicenceExpiry.trim(),
        insuranceExpiry: form.insuranceExpiry.trim(),
      };
    }

    setSubmitting(true);

    try {
      await register(payload);

      const message = form.wantsToDrive
        ? 'Your driver application was submitted for review. You can log in now.'
        : 'Your account has been created. You can log in now.';

      Alert.alert('Account created', message, [
        {
          text: 'OK',
          onPress: () => router.replace('/(auth)/login'),
        },
      ]);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>
            Join Share-Ride as a passenger or driver.
          </Text>

          {formError ? (
            <Text style={styles.apiError}>{formError}</Text>
          ) : null}

          {/* Profile photo */}
          <View style={styles.photoWrap}>
            <TouchableOpacity
              onPress={choosePhotoSource}
              activeOpacity={0.8}
            >
              <View
                style={[
                  styles.photoCircle,
                  errors.photo && styles.inputError,
                ]}
              >
                {photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.photoImage}
                  />
                ) : (
                  <Text style={styles.photoPlus}>+</Text>
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.photoLabel}>
              {photoUri ? 'Change photo' : 'Add profile photo'}
            </Text>

            <Text style={styles.photoHint}>
              Required. Use a clear photo of your face.
            </Text>

            {errors.photo ? (
              <Text style={styles.fieldError}>{errors.photo}</Text>
            ) : null}
          </View>

          {/* Account details */}
          <Text style={styles.section}>Your details</Text>

          <Field
            label="Full name"
            value={form.fullName}
            onChangeText={set('fullName')}
            error={errors.fullName}
            autoCapitalize="words"
            placeholder="Nimal Perera"
          />

          <Field
            label="Mobile number"
            value={form.mobile}
            onChangeText={set('mobile')}
            error={errors.mobile}
            keyboardType="phone-pad"
            placeholder="+94771234567"
          />

          <Field
            label="Email"
            value={form.email}
            onChangeText={set('email')}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
          />

          <Field
            label="Password"
            value={form.password}
            onChangeText={set('password')}
            error={errors.password}
            secureTextEntry
            autoCapitalize="none"
            placeholder="At least 8 characters"
          />

          <Field
            label="Confirm password"
            value={form.confirmPassword}
            onChangeText={set('confirmPassword')}
            error={errors.confirmPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Repeat your password"
          />

          <Chips
            label="Gender"
            options={GENDERS}
            value={form.gender}
            onChange={set('gender')}
            error={errors.gender}
          />

          <Field
            label="Date of birth"
            value={form.dateOfBirth}
            onChangeText={set('dateOfBirth')}
            error={errors.dateOfBirth}
            placeholder="YYYY-MM-DD"
          />

          {/* Driver registration toggle */}
          <View style={styles.switchRow}>
            <View style={styles.switchContent}>
              <Text style={styles.switchTitle}>I want to drive</Text>
              <Text style={styles.switchHint}>
                Add your licence and vehicle details. An administrator
                reviews your application before you can publish rides.
              </Text>
            </View>

            <Switch
              value={form.wantsToDrive}
              onValueChange={set('wantsToDrive')}
              trackColor={{ true: colors.primary }}
            />
          </View>

          {form.wantsToDrive ? (
            <View>
              {/* Driver details */}
              <Text style={styles.section}>Driver details</Text>

              <Field
                label="NIC number"
                value={form.nicNumber}
                onChangeText={set('nicNumber')}
                error={errors.nicNumber}
                autoCapitalize="characters"
                placeholder="199012345678 or 901234567V"
              />

              <Field
                label="Driving licence number"
                value={form.licenceNumber}
                onChangeText={set('licenceNumber')}
                error={errors.licenceNumber}
                autoCapitalize="characters"
                placeholder="B1234567"
              />

              <Field
                label="Licence class"
                value={form.licenceClass}
                onChangeText={set('licenceClass')}
                error={errors.licenceClass}
                autoCapitalize="characters"
                placeholder="B"
              />

              <Field
                label="Licence expiry date"
                value={form.licenceExpiry}
                onChangeText={set('licenceExpiry')}
                error={errors.licenceExpiry}
                placeholder="YYYY-MM-DD"
              />

              <Field
                label="Address"
                value={form.address}
                onChangeText={set('address')}
                error={errors.address}
                autoCapitalize="words"
                placeholder="No. 12, Main Street, Matara"
              />

              <Field
                label="Emergency contact name"
                value={form.emergencyName}
                onChangeText={set('emergencyName')}
                error={errors.emergencyName}
                autoCapitalize="words"
                placeholder="Contact person"
              />

              <Field
                label="Emergency contact phone"
                value={form.emergencyPhone}
                onChangeText={set('emergencyPhone')}
                error={errors.emergencyPhone}
                keyboardType="phone-pad"
                placeholder="+94771234567"
              />

              {/* Vehicle details */}
              <Text style={styles.section}>Vehicle details</Text>

              <Text style={styles.label}>Vehicle photo</Text>

              <TouchableOpacity
                onPress={chooseVehiclePhotoSource}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.vehiclePhotoBox,
                    errors.vehiclePhoto && styles.inputError,
                  ]}
                >
                  {vehiclePhotoUri ? (
                    <Image
                      source={{ uri: vehiclePhotoUri }}
                      style={styles.vehiclePhotoImage}
                    />
                  ) : (
                    <Text style={styles.vehiclePhotoPrompt}>
                      + Add vehicle photo
                    </Text>
                  )}
                </View>
              </TouchableOpacity>

              <Text style={styles.photoHint}>
                {vehiclePhotoUri
                  ? 'Tap to change the photo.'
                  : 'Required. Show the vehicle and its number plate.'}
              </Text>

              {errors.vehiclePhoto ? (
                <Text style={styles.fieldError}>
                  {errors.vehiclePhoto}
                </Text>
              ) : null}

              <Chips
                label="Vehicle type"
                options={VEHICLE_TYPES}
                value={form.vehicleType}
                onChange={set('vehicleType')}
                error={errors.vehicleType}
              />

              <Field
                label="Brand"
                value={form.make}
                onChangeText={set('make')}
                error={errors.make}
                autoCapitalize="words"
                placeholder="Toyota"
              />

              <Field
                label="Model"
                value={form.model}
                onChangeText={set('model')}
                error={errors.model}
                autoCapitalize="words"
                placeholder="Prius"
              />

              <Field
                label="Colour"
                value={form.colour}
                onChangeText={set('colour')}
                error={errors.colour}
                autoCapitalize="words"
                placeholder="White"
              />

              <Field
                label="Year"
                value={form.year}
                onChangeText={set('year')}
                error={errors.year}
                keyboardType="number-pad"
                placeholder="2018"
              />

              <Field
                label="Number plate"
                value={form.plateNo}
                onChangeText={set('plateNo')}
                error={errors.plateNo}
                autoCapitalize="characters"
                placeholder="CAB-1234"
              />

              <Field
                label="Passenger seats (excluding driver)"
                value={form.seats}
                onChangeText={set('seats')}
                error={errors.seats}
                keyboardType="number-pad"
                placeholder="3"
              />

              <View style={styles.switchRow}>
                <Text style={styles.switchTitle}>Air conditioning</Text>

                <Switch
                  value={form.hasAC}
                  onValueChange={set('hasAC')}
                  trackColor={{ true: colors.primary }}
                />
              </View>

              <Chips
                label="Luggage space"
                options={LUGGAGE_OPTIONS}
                value={form.luggage}
                onChange={set('luggage')}
                error={errors.luggage}
              />

              <Field
                label="Vehicle description"
                value={form.description}
                onChangeText={set('description')}
                error={errors.description}
                multiline
                autoCapitalize="sentences"
                placeholder="Clean, comfortable, non-smoking..."
              />

              <Field
                label="Registration (CR) number"
                value={form.crNumber}
                onChangeText={set('crNumber')}
                error={errors.crNumber}
                autoCapitalize="characters"
                placeholder="Certificate of registration number"
              />

              <Field
                label="Revenue licence expiry"
                value={form.revenueLicenceExpiry}
                onChangeText={set('revenueLicenceExpiry')}
                error={errors.revenueLicenceExpiry}
                placeholder="YYYY-MM-DD"
              />

              <Field
                label="Insurance expiry"
                value={form.insuranceExpiry}
                onChangeText={set('insuranceExpiry')}
                error={errors.insuranceExpiry}
                placeholder="YYYY-MM-DD"
              />
            </View>
          ) : null}

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.button,
              submitting && styles.buttonDisabled,
            ]}
            onPress={handleRegister}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
            </Text>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.link}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },

  container: {
    padding: 24,
    paddingBottom: 48,
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.secondary,
  },

  subtitle: {
    fontSize: 15,
    color: colors.text,
    marginTop: 4,
    marginBottom: 16,
  },

  section: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginTop: 24,
    marginBottom: 4,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginTop: 12,
    marginBottom: 6,
  },

  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },

  fieldError: {
    color: colors.error,
    fontSize: 13,
    marginTop: 4,
  },

  apiError: {
    color: colors.error,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },

  photoWrap: {
    alignItems: 'center',
    marginVertical: 12,
  },

  photoCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  photoImage: {
    width: '100%',
    height: '100%',
  },

  photoPlus: {
    fontSize: 40,
    color: colors.primary,
  },

  photoLabel: {
    color: colors.primary,
    fontWeight: 'bold',
    marginTop: 8,
  },

  photoHint: {
    color: colors.text,
    opacity: 0.7,
    fontSize: 12,
    marginTop: 4,
  },

  vehiclePhotoBox: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },

  vehiclePhotoImage: {
    width: '100%',
    height: '100%',
  },

  vehiclePhotoPrompt: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },

  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  chipText: {
    color: colors.text,
  },

  chipTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },

  switchContent: {
    flex: 1,
  },

  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },

  switchHint: {
    fontSize: 13,
    color: colors.text,
    marginTop: 4,
    paddingRight: 8,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    minHeight: 50,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  buttonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  footerText: {
    color: colors.text,
  },

  link: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
