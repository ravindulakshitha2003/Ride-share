import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Easing,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import { colors } from '../../theme/colors';
import useAuth from '../../hooks/useAuth';
import { getErrorMessage } from '../../api/client';

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

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

// Turn a Date into YYYY-MM-DD using the phone's local date.
function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// While typing, keep only digits and add the dashes automatically: 20000115 -> 2000-01-15.
function formatDateInput(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

// The latest allowed date of birth: exactly 18 years ago today.
function adultCutoffDate() {
  const today = new Date();

  return new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  );
}

// Tomorrow at midnight: the earliest date offered for expiry dates.
function tomorrowDate() {
  const today = new Date();

  return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
}

// Thirty years from today: the latest date offered for expiry dates.
function farFutureDate() {
  const today = new Date();

  return new Date(
    today.getFullYear() + 30,
    today.getMonth(),
    today.getDate()
  );
}

// The earliest date offered by the date of birth calendar.
const MIN_DOB = new Date(1920, 0, 1);

// ---------------------------------------------------------------------------
// Reusable form pieces
// ---------------------------------------------------------------------------

// A text box with an icon on the left. Password boxes get a show/hide eye.
function IconField({
  label,
  icon,
  error,
  secureTextEntry,
  multiline,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.fieldRow,
          multiline && styles.fieldRowTop,
          focused && styles.fieldFocused,
          error && styles.fieldErrorBorder,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={error ? colors.error : colors.primary}
          style={[styles.fieldIcon, multiline && styles.fieldIconTop]}
        />

        <TextInput
          style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isPassword && hidden}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setHidden((current) => !current)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// A date box: type the date (dashes are added for you) or tap the calendar button.
function DateInputField({
  label,
  icon,
  value,
  onChangeText,
  error,
  minimumDate,
  maximumDate,
  initialDate,
}) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);

  // Start the calendar on the typed date when it is valid and allowed.
  const typed = parseDate(String(value ?? '').trim());
  const inRange =
    typed &&
    (!minimumDate || typed >= minimumDate) &&
    (!maximumDate || typed <= maximumDate);
  const pickerValue = inRange
    ? typed
    : initialDate ?? maximumDate ?? minimumDate ?? new Date();

  // Called when the user picks a date in the calendar.
  function handlePicked(event, selected) {
    // The calendar closes after any answer (OK or cancel).
    setShow(false);

    // Only keep the date if the user pressed OK.
    if (event.type === 'set' && selected) {
      onChangeText(toDateString(selected));
    }
  }

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.fieldRow,
          focused && styles.fieldFocused,
          error && styles.fieldErrorBorder,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={error ? colors.error : colors.primary}
          style={styles.fieldIcon}
        />

        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={(text) => onChangeText(formatDateInput(text))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9CA3AF"
          keyboardType="number-pad"
          maxLength={10}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />

        <TouchableOpacity
          style={styles.calendarButton}
          onPress={() => setShow(true)}
          activeOpacity={0.7}
          accessibilityLabel={`Choose ${label} from the calendar`}
        >
          <Ionicons name="calendar" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.fieldError}>{error}</Text> : null}

      {show ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={handlePicked}
        />
      ) : null}
    </View>
  );
}

// A row of tap-to-select options, with an icon beside the label and optional icons on each option.
function Chips({ label, icon, options, value, onChange, error }) {
  return (
    <View>
      <View style={styles.chipLabelRow}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={colors.primary}
            style={styles.chipLabelIcon}
          />
        ) : null}
        <Text style={styles.chipLabelText}>{label}</Text>
      </View>

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
              {option.icon ? (
                <Ionicons
                  name={option.icon}
                  size={16}
                  color={selected ? colors.white : colors.primary}
                  style={styles.chipIcon}
                />
              ) : null}

              <Text
                style={[styles.chipText, selected && styles.chipTextActive]}
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

// ---------------------------------------------------------------------------
// Options and starting values
// ---------------------------------------------------------------------------

const GENDERS = [
  { label: 'Male', value: 'Male', icon: 'male-outline' },
  { label: 'Female', value: 'Female', icon: 'female-outline' },
  {
    label: 'Prefer not to say',
    value: 'Prefer not to say',
    icon: 'help-circle-outline',
  },
];

const VEHICLE_TYPES = [
  { label: 'Car', value: 'Car', icon: 'car-outline' },
  { label: 'Van', value: 'Van', icon: 'bus-outline' },
  { label: 'SUV', value: 'SUV', icon: 'car-sport-outline' },
  { label: 'Other', value: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
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

// The pages of the form. Passengers see the first two; drivers continue through the driver pages.
const PASSENGER_STEPS = ['basic', 'more'];
const DRIVER_STEPS = [
  'licence',
  'contact',
  'vehicle',
  'vehicleDetails',
  'documents',
];

// Heading shown at the top of each page.
const STEP_INFO = {
  basic: {
    title: 'Create your account',
    subtitle: "Let's start with the basics.",
  },
  more: {
    title: 'A bit more about you',
    subtitle: 'Almost done. Just a few more details.',
  },
  licence: {
    title: 'Your driving licence',
    subtitle: 'We need these details to verify that you can drive.',
  },
  contact: {
    title: 'Address and emergency contact',
    subtitle: 'Used for safety and verification only.',
  },
  vehicle: {
    title: 'Your vehicle',
    subtitle: 'Tell passengers what they will be travelling in.',
  },
  vehicleDetails: {
    title: 'Vehicle details',
    subtitle: 'Seats and facilities shown to passengers when they search.',
  },
  documents: {
    title: 'Vehicle documents',
    subtitle: 'An administrator reviews these before you can publish rides.',
  },
};

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { width } = useWindowDimensions();

  // The number of the page that is showing (1 = first page).
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [vehiclePhotoUri, setVehiclePhotoUri] = useState(null);

  // Passengers finish after two pages; drivers continue through five more short pages.
  const steps = form.wantsToDrive
    ? [...PASSENGER_STEPS, ...DRIVER_STEPS]
    : PASSENGER_STEPS;
  const totalSteps = steps.length;
  // The name of the page that is showing, for example 'basic' or 'vehicle'.
  const stepKey = steps[step - 1];
  const isLastStep = step === totalSteps;

  // Animation: 0 = step is visible, -1 / 1 = off screen to the left / right.
  const anim = useRef(new Animated.Value(0)).current;
  // Stops double taps from starting two animations at once.
  const busy = useRef(false);
  const scrollRef = useRef(null);

  // The step slides sideways while fading in and out.
  const translateX = anim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-width * 0.25, 0, width * 0.25],
  });
  const opacity = anim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0, 1, 0],
  });

  // Slide the current step out, switch steps, then slide the new step in.
  function goToStep(next) {
    if (busy.current || next === step) return;
    busy.current = true;

    // Going forward: old step leaves to the left, new step enters from the right.
    const direction = next > step ? 1 : -1;

    Animated.timing(anim, {
      toValue: -direction,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      // Place the new step on the opposite side, still invisible.
      anim.setValue(direction);

      Animated.timing(anim, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        busy.current = false;
      });
    });
  }

  // Android back button goes to the previous step instead of leaving the screen.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (step > 1) {
          goToStep(step - 1);
          return true;
        }
        return false;
      }
    );

    return () => subscription.remove();
  }, [step]);

  // Update one form field and clear its error.
  const set = (key) => (value) => {
    setForm((current) => ({ ...current, [key]: value }));

    setErrors((current) => ({
      ...current,
      [key]: undefined,
    }));
  };

  // Trimmed text of a form field.
  const value = (key) => String(form[key] ?? '').trim();

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

    Alert.alert('Profile photo', 'Choose a clear photo of your face.', buttons);
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
      setErrors((current) => ({ ...current, vehiclePhoto: undefined }));
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

  // Validate only the fields that belong to one page.
  function validateStep(key) {
    const error = {};
    const today = new Date();

    // ---- Basic details ----
    if (key === 'basic') {
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
    }

    // ---- More details ----
    if (key === 'more') {
      if (!form.gender) {
        error.gender = 'Please choose an option.';
      }

      const dob = parseDate(value('dateOfBirth'));

      if (!dob) {
        error.dateOfBirth = 'Use a valid date in YYYY-MM-DD format.';
      } else if (dob > adultCutoffDate()) {
        error.dateOfBirth = 'You must be at least 18 years old.';
      } else if (dob < MIN_DOB) {
        error.dateOfBirth = 'Please check the year.';
      }

      if (!photoUri) {
        error.photo = 'Please add a profile photo.';
      }
    }

    // ---- Driver page 1: identity and licence ----
    if (key === 'licence') {
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
    }

    // ---- Driver page 2: address and emergency contact ----
    if (key === 'contact') {
      if (!value('address')) {
        error.address = 'Address is required.';
      }

      if (!value('emergencyName')) {
        error.emergencyName = 'Emergency contact name is required.';
      }

      if (!/^\+94\d{9}$/.test(value('emergencyPhone'))) {
        error.emergencyPhone = 'Use the format +94771234567.';
      }
    }

    // ---- Driver page 3: the vehicle ----
    if (key === 'vehicle') {
      if (!vehiclePhotoUri) {
        error.vehiclePhoto = 'Please add a vehicle photo.';
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
    }

    // ---- Driver page 4: vehicle details ----
    if (key === 'vehicleDetails') {
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
    }

    // ---- Driver page 5: description and documents ----
    if (key === 'documents') {
      if (!value('description')) {
        error.description = 'Vehicle description is required.';
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
    }

    return error;
  }

  // Next button: check this step, then move on (or submit on the last step).
  function handleNext() {
    if (submitting) return;

    if (isLastStep) {
      handleRegister();
      return;
    }

    const stepErrors = validateStep(stepKey);
    setErrors(stepErrors);

    if (Object.keys(stepErrors).length > 0) {
      setFormError('Please fix the highlighted fields.');
      return;
    }

    setFormError('');
    goToStep(step + 1);
  }

  // Submit the registration form.
  async function handleRegister() {
    if (submitting) return;

    setFormError('');

    // Check every step again; jump back to the first step with a problem.
    for (let n = 1; n <= totalSteps; n += 1) {
      const stepErrors = validateStep(steps[n - 1]);

      if (Object.keys(stepErrors).length > 0) {
        setErrors(stepErrors);
        setFormError('Please fix the highlighted fields.');
        if (n !== step) goToStep(n);
        return;
      }
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

    // Driver and vehicle details are sent only for people who registered as a driver.
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

  // ---------- Step 1: basic details ----------
  function renderBasicStep() {
    return (
      <View>
        <IconField
          label="Full name"
          icon="person-outline"
          value={form.fullName}
          onChangeText={set('fullName')}
          error={errors.fullName}
          autoCapitalize="words"
          placeholder="Nimal Perera"
        />

        <IconField
          label="Mobile number"
          icon="call-outline"
          value={form.mobile}
          onChangeText={set('mobile')}
          error={errors.mobile}
          keyboardType="phone-pad"
          placeholder="+94771234567"
        />

        <IconField
          label="Email"
          icon="mail-outline"
          value={form.email}
          onChangeText={set('email')}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="you@example.com"
        />

        <IconField
          label="Password"
          icon="lock-closed-outline"
          value={form.password}
          onChangeText={set('password')}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          placeholder="At least 8 characters"
        />

        <IconField
          label="Confirm password"
          icon="shield-checkmark-outline"
          value={form.confirmPassword}
          onChangeText={set('confirmPassword')}
          error={errors.confirmPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Repeat your password"
        />
      </View>
    );
  }

  // ---------- Step 2: more details ----------
  function renderMoreStep() {
    return (
      <View>
        {/* Profile photo */}
        <View style={styles.photoWrap}>
          <TouchableOpacity onPress={choosePhotoSource} activeOpacity={0.8}>
            <View
              style={[styles.photoCircle, errors.photo && styles.inputError]}
            >
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoImage} />
              ) : (
                <Ionicons name="camera-outline" size={38} color={colors.primary} />
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

        <Chips
          label="Gender"
          icon="people-outline"
          options={GENDERS}
          value={form.gender}
          onChange={set('gender')}
          error={errors.gender}
        />

        <DateInputField
          label="Date of birth"
          icon="gift-outline"
          value={form.dateOfBirth}
          onChangeText={set('dateOfBirth')}
          error={errors.dateOfBirth}
          minimumDate={MIN_DOB}
          maximumDate={adultCutoffDate()}
          initialDate={adultCutoffDate()}
        />

        <Text style={styles.photoHint}>
          Type the date, or tap the calendar to choose it.
        </Text>

        {/* Choice: register as a driver too (adds a third page) */}
        <View style={styles.driverCard}>
          <View style={styles.driverIcon}>
            <Ionicons
              name="car-sport-outline"
              size={22}
              color={colors.primary}
            />
          </View>

          <View style={styles.switchContent}>
            <Text style={styles.switchTitle}>Register as a driver</Text>
            <Text style={styles.switchHint}>
              Optional. Add your licence and vehicle details over a few short pages.
              An administrator reviews them before you can publish rides. Not
              a driver? Just tap Create account.
            </Text>
          </View>

          <Switch
            value={form.wantsToDrive}
            onValueChange={set('wantsToDrive')}
            trackColor={{ true: colors.primary }}
          />
        </View>
      </View>
    );
  }

  // ---------- Driver page 1: identity and licence ----------
  function renderLicenceStep() {
    return (
      <View>
        <IconField
          label="NIC number"
          icon="card-outline"
          value={form.nicNumber}
          onChangeText={set('nicNumber')}
          error={errors.nicNumber}
          autoCapitalize="characters"
          placeholder="199012345678 or 901234567V"
        />

        <IconField
          label="Driving licence number"
          icon="document-text-outline"
          value={form.licenceNumber}
          onChangeText={set('licenceNumber')}
          error={errors.licenceNumber}
          autoCapitalize="characters"
          placeholder="B1234567"
        />

        <IconField
          label="Licence class"
          icon="ribbon-outline"
          value={form.licenceClass}
          onChangeText={set('licenceClass')}
          error={errors.licenceClass}
          autoCapitalize="characters"
          placeholder="B"
        />

        <DateInputField
          label="Licence expiry date"
          icon="calendar-outline"
          value={form.licenceExpiry}
          onChangeText={set('licenceExpiry')}
          error={errors.licenceExpiry}
          minimumDate={tomorrowDate()}
          maximumDate={farFutureDate()}
        />

        <Text style={styles.photoHint}>
          Type the date, or tap the calendar to choose it.
        </Text>
      </View>
    );
  }

  // ---------- Driver page 2: address and emergency contact ----------
  function renderContactStep() {
    return (
      <View>
        <IconField
          label="Address"
          icon="home-outline"
          value={form.address}
          onChangeText={set('address')}
          error={errors.address}
          autoCapitalize="words"
          placeholder="No. 12, Main Street, Matara"
        />

        <IconField
          label="Emergency contact name"
          icon="person-add-outline"
          value={form.emergencyName}
          onChangeText={set('emergencyName')}
          error={errors.emergencyName}
          autoCapitalize="words"
          placeholder="Contact person"
        />

        <IconField
          label="Emergency contact phone"
          icon="call-outline"
          value={form.emergencyPhone}
          onChangeText={set('emergencyPhone')}
          error={errors.emergencyPhone}
          keyboardType="phone-pad"
          placeholder="+94771234567"
        />
      </View>
    );
  }

  // ---------- Driver page 3: the vehicle ----------
  function renderVehicleStep() {
    return (
      <View>
        {/* Vehicle photo */}
        <View style={styles.chipLabelRow}>
          <Ionicons
            name="camera-outline"
            size={18}
            color={colors.primary}
            style={styles.chipLabelIcon}
          />
          <Text style={styles.chipLabelText}>Vehicle photo</Text>
        </View>

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
              <View style={styles.vehiclePhotoEmpty}>
                <Ionicons
                  name="camera-outline"
                  size={32}
                  color={colors.primary}
                />
                <Text style={styles.vehiclePhotoPrompt}>Add vehicle photo</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <Text style={styles.photoHint}>
          {vehiclePhotoUri
            ? 'Tap to change the photo.'
            : 'Required. Show the vehicle and its number plate.'}
        </Text>

        {errors.vehiclePhoto ? (
          <Text style={styles.fieldError}>{errors.vehiclePhoto}</Text>
        ) : null}

        <Chips
          label="Vehicle type"
          icon="car-sport-outline"
          options={VEHICLE_TYPES}
          value={form.vehicleType}
          onChange={set('vehicleType')}
          error={errors.vehicleType}
        />

        <IconField
          label="Brand"
          icon="car-outline"
          value={form.make}
          onChangeText={set('make')}
          error={errors.make}
          autoCapitalize="words"
          placeholder="Toyota"
        />

        <IconField
          label="Model"
          icon="pricetag-outline"
          value={form.model}
          onChangeText={set('model')}
          error={errors.model}
          autoCapitalize="words"
          placeholder="Prius"
        />

        <IconField
          label="Colour"
          icon="color-palette-outline"
          value={form.colour}
          onChangeText={set('colour')}
          error={errors.colour}
          autoCapitalize="words"
          placeholder="White"
        />
      </View>
    );
  }

  // ---------- Driver page 4: vehicle details ----------
  function renderVehicleDetailsStep() {
    return (
      <View>
        <IconField
          label="Year"
          icon="calendar-outline"
          value={form.year}
          onChangeText={set('year')}
          error={errors.year}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="2018"
        />

        <IconField
          label="Number plate"
          icon="barcode-outline"
          value={form.plateNo}
          onChangeText={set('plateNo')}
          error={errors.plateNo}
          autoCapitalize="characters"
          placeholder="CAB-1234"
        />

        <IconField
          label="Passenger seats (excluding driver)"
          icon="people-outline"
          value={form.seats}
          onChangeText={set('seats')}
          error={errors.seats}
          keyboardType="number-pad"
          maxLength={1}
          placeholder="3"
        />

        <View style={styles.switchRow}>
          <View style={styles.switchLabelRow}>
            <Ionicons
              name="snow-outline"
              size={20}
              color={colors.primary}
              style={styles.fieldIcon}
            />
            <Text style={styles.switchTitle}>Air conditioning</Text>
          </View>

          <Switch
            value={form.hasAC}
            onValueChange={set('hasAC')}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Chips
          label="Luggage space"
          icon="bag-handle-outline"
          options={LUGGAGE_OPTIONS}
          value={form.luggage}
          onChange={set('luggage')}
          error={errors.luggage}
        />
      </View>
    );
  }

  // ---------- Driver page 5: description and documents ----------
  function renderDocumentsStep() {
    return (
      <View>
        <IconField
          label="Vehicle description"
          icon="chatbubble-ellipses-outline"
          value={form.description}
          onChangeText={set('description')}
          error={errors.description}
          multiline
          autoCapitalize="sentences"
          placeholder="Clean, comfortable, non-smoking..."
        />

        <IconField
          label="Registration (CR) number"
          icon="document-attach-outline"
          value={form.crNumber}
          onChangeText={set('crNumber')}
          error={errors.crNumber}
          autoCapitalize="characters"
          placeholder="Certificate of registration number"
        />

        <DateInputField
          label="Revenue licence expiry"
          icon="receipt-outline"
          value={form.revenueLicenceExpiry}
          onChangeText={set('revenueLicenceExpiry')}
          error={errors.revenueLicenceExpiry}
          minimumDate={tomorrowDate()}
          maximumDate={farFutureDate()}
        />

        <DateInputField
          label="Insurance expiry"
          icon="shield-checkmark-outline"
          value={form.insuranceExpiry}
          onChangeText={set('insuranceExpiry')}
          error={errors.insuranceExpiry}
          minimumDate={tomorrowDate()}
          maximumDate={farFutureDate()}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress: one bar segment per step */}
          <View style={styles.progressRow}>
            {Array.from({ length: totalSteps }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.progressSegment,
                  index < step && styles.progressSegmentActive,
                ]}
              />
            ))}
          </View>

          <Text style={styles.stepText}>
            {step > PASSENGER_STEPS.length ? 'Driver details  ·  ' : ''}
            Step {step} of {totalSteps}
          </Text>

          {/* Everything below slides and fades when the step changes */}
          <Animated.View style={{ opacity, transform: [{ translateX }] }}>
            <Text style={styles.title}>{STEP_INFO[stepKey].title}</Text>
            <Text style={styles.subtitle}>{STEP_INFO[stepKey].subtitle}</Text>

            {formError ? (
              <Text style={styles.apiError}>{formError}</Text>
            ) : null}

            {stepKey === 'basic' ? renderBasicStep() : null}
            {stepKey === 'more' ? renderMoreStep() : null}
            {stepKey === 'licence' ? renderLicenceStep() : null}
            {stepKey === 'contact' ? renderContactStep() : null}
            {stepKey === 'vehicle' ? renderVehicleStep() : null}
            {stepKey === 'vehicleDetails' ? renderVehicleDetailsStep() : null}
            {stepKey === 'documents' ? renderDocumentsStep() : null}

            {/* Back and Next / Create account buttons */}
            <View style={styles.navRow}>
              {step > 1 ? (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => goToStep(step - 1)}
                  disabled={submitting}
                  activeOpacity={0.8}
                >
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.button, submitting && styles.buttonDisabled]}
                onPress={handleNext}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.buttonText}>
                    {isLastStep ? 'Create account' : 'Next'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Login link, shown on the first step only */}
            {step === 1 ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  Already have an account?{' '}
                </Text>

                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.link}>Log in</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </Animated.View>
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

  progressRow: {
    flexDirection: 'row',
    gap: 6,
  },

  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },

  progressSegmentActive: {
    backgroundColor: colors.primary,
  },

  stepText: {
    fontSize: 13,
    color: colors.text,
    opacity: 0.7,
    marginTop: 8,
    marginBottom: 16,
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

  // ---- Fields with icons ----
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },

  fieldRowTop: {
    alignItems: 'flex-start',
  },

  fieldFocused: {
    borderColor: colors.primary,
  },

  fieldErrorBorder: {
    borderColor: colors.error,
  },

  fieldIcon: {
    marginRight: 10,
  },

  fieldIconTop: {
    marginTop: 14,
  },

  fieldInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },

  fieldInputMulti: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  calendarButton: {
    paddingLeft: 12,
    paddingVertical: 12,
    marginLeft: 4,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },

  // ---- Section headings ----
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 4,
  },

  section: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 8,
  },

  // ---- Photos ----
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
    borderWidth: 1.5,
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

  vehiclePhotoEmpty: {
    alignItems: 'center',
  },

  vehiclePhotoPrompt: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
    marginTop: 6,
  },

  // ---- Chips ----
  chipLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 6,
  },

  chipLabelIcon: {
    marginRight: 6,
  },

  chipLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
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

  chipIcon: {
    marginRight: 6,
  },

  chipText: {
    color: colors.text,
  },

  chipTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },

  // ---- Switches ----
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 24,
    gap: 12,
  },

  driverIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEEBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },

  switchLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
    fontSize: 12,
    color: colors.text,
    opacity: 0.75,
    marginTop: 4,
    lineHeight: 17,
  },

  // ---- Navigation buttons ----
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
  },

  backButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },

  backText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },

  button: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
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