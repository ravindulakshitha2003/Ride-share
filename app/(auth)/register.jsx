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

// Turn a Date into YYYY-MM-DD using the phone's local date.
function toDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
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

// The earliest date offered by the calendar.
const MIN_DOB = new Date(1920, 0, 1);

// While typing, keep only digits and add the dashes automatically: 20000115 -> 2000-01-15.
function formatDobInput(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;

  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
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

const GENDERS = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Prefer not to say', value: 'Prefer not to say' },
];

const EMPTY_FORM = {
  fullName: '',
  mobile: '+94',
  email: '',
  password: '',
  confirmPassword: '',
  gender: '',
  dateOfBirth: '',
};

// Registration has two pages.
const TOTAL_STEPS = 2;

// Heading shown at the top of each step.
const STEP_INFO = {
  1: {
    title: 'Create your account',
    subtitle: "Let's start with the basics.",
  },
  2: {
    title: 'A bit more about you',
    subtitle: 'Almost done. Just a few more details.',
  },
};

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { width } = useWindowDimensions();

  // Step 1 = basic details, step 2 = more details.
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  // Whether the date of birth calendar is open.
  const [showDobPicker, setShowDobPicker] = useState(false);

  const isLastStep = step === TOTAL_STEPS;

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

  // Called when the user picks a date in the calendar.
  function handleDobPicked(event, selected) {
    // The calendar closes after any answer (OK or cancel).
    setShowDobPicker(false);

    // Only keep the date if the user pressed OK.
    if (event.type === 'set' && selected) {
      set('dateOfBirth')(toDateString(selected));
    }
  }

  // Validate only the fields that belong to one step.
  function validateStep(stepNumber) {
    const error = {};

    // ---- Step 1: basic details ----
    if (stepNumber === 1) {
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

    // ---- Step 2: more details ----
    if (stepNumber === 2) {
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

    return error;
  }

  // Next button: check this step, then move on (or submit on the last step).
  function handleNext() {
    if (submitting) return;

    if (isLastStep) {
      handleRegister();
      return;
    }

    const stepErrors = validateStep(step);
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
    for (let n = 1; n <= TOTAL_STEPS; n += 1) {
      const stepErrors = validateStep(n);

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
      photoUri,
    };

    setSubmitting(true);

    try {
      await register(payload);

      Alert.alert(
        'Account created',
        'Your account has been created. You can log in now.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
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
      </View>
    );
  }

  // ---------- Step 2: more details ----------
  function renderMoreStep() {
    // Start the calendar on the typed date when it is valid, otherwise on the latest allowed date.
    const cutoff = adultCutoffDate();
    const typed = parseDate(value('dateOfBirth'));
    const pickerValue =
      typed && typed <= cutoff && typed >= MIN_DOB ? typed : cutoff;

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

        <Chips
          label="Gender"
          options={GENDERS}
          value={form.gender}
          onChange={set('gender')}
          error={errors.gender}
        />

        {/* Date of birth: type it, or tap the calendar icon */}
        <Text style={styles.label}>Date of birth</Text>

        <View
          style={[styles.dobRow, errors.dateOfBirth && styles.inputError]}
        >
          <TextInput
            style={styles.dobInput}
            value={form.dateOfBirth}
            onChangeText={(text) => set('dateOfBirth')(formatDobInput(text))}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9CA3AF"
            keyboardType="number-pad"
            maxLength={10}
          />

          <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowDobPicker(true)}
            activeOpacity={0.7}
            accessibilityLabel="Choose date of birth from the calendar"
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.photoHint}>
          Type the date, or tap the calendar to choose it.
        </Text>

        {errors.dateOfBirth ? (
          <Text style={styles.fieldError}>{errors.dateOfBirth}</Text>
        ) : null}

        {/* Calendar pop-up: only dates that make the user 18 or older can be chosen */}
        {showDobPicker ? (
          <DateTimePicker
            value={pickerValue}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={cutoff}
            minimumDate={MIN_DOB}
            onChange={handleDobPicked}
          />
        ) : null}
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
            {Array.from({ length: TOTAL_STEPS }, (_, index) => (
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
            Step {step} of {TOTAL_STEPS}
          </Text>

          {/* Everything below slides and fades when the step changes */}
          <Animated.View style={{ opacity, transform: [{ translateX }] }}>
            <Text style={styles.title}>{STEP_INFO[step].title}</Text>
            <Text style={styles.subtitle}>{STEP_INFO[step].subtitle}</Text>

            {formError ? (
              <Text style={styles.apiError}>{formError}</Text>
            ) : null}

            {step === 1 ? renderBasicStep() : null}
            {step === 2 ? renderMoreStep() : null}

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

  dobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },

  dobInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },

  calendarButton: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
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