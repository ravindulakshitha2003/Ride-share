
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

/* -------------------------------------------------------
   Design tokens
------------------------------------------------------- */

const T = {
  primary: '#5B4BDB',
  secondary: '#312E81',
  accent: '#F0ABFC',
  background: '#F8F7FF',
  text: '#24213B',
  muted: 'rgba(36,33,59,0.6)',
  white: '#FFFFFF',
  border: '#E4E1F5',
  tint: '#EEEBFF',
  gradientEnd: '#E9E4FF',

  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',
  dangerText: '#7F1D1D',

  pending: '#F59E0B',
  approved: '#16A34A',
  rejected: '#DC2626',
  inactive: '#6B7280',
  expired: '#EA580C',

  radius: {
    sm: 12,
    md: 16,
    lg: 24,
    xl: 28,
    pill: 999,
  },

  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },

  shadow: {
    shadowColor: '#5B4BDB',
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};

const STATUS = {
  Pending: T.pending,
  Approved: T.approved,
  Rejected: T.rejected,
  Inactive: T.inactive,
  Expired: T.expired,
};

/* -------------------------------------------------------
   Dummy data and fake API
------------------------------------------------------- */

const DUMMY_VEHICLE = {
  _id: 'veh_001',
  type: 'Car',
  make: 'Toyota',
  model: 'Axio',
  colour: 'White',
  year: 2018,
  plateNo: 'ABC1234',
  seats: 4,
  hasAC: true,
  luggage: 'Available',

  documents: {
    registration: {
      fileKey: 'docs/registration/axio-reg.pdf',
    },
    revenueLicence: {
      fileKey: 'docs/revenueLicence/axio-rev.pdf',
      expiry: '2027-03-14',
    },
    insurance: {
      fileKey: 'docs/insurance/axio-ins.pdf',
      expiry: '2027-06-30',
    },
  },

  photoUrl: 'https://picsum.photos/seed/axio-front/800/500',
  status: 'Pending',
  rejectionReason: null,
  createdAt: '2026-10-20T09:00:00.000Z',
  updatedAt: '2026-10-20T09:00:00.000Z',
};

const TAKEN_PLATES = ['CAB5678', 'KX9021'];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// TODO: Replace with GET /api/vehicles/me.
async function getMyVehicle() {
  await wait(600);
  return { ...DUMMY_VEHICLE };
}

// TODO: Replace with PATCH /api/vehicles/:id.
async function updateVehicle(id, patch) {
  await wait(800);

  if (TAKEN_PLATES.includes(patch.plateNo)) {
    throw new Error('This plate number is already registered.');
  }

  return {
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

const getErrorMessage = (error) =>
  error?.message || 'Something went wrong. Please try again.';

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

const TYPES = ['Car', 'Van', 'SUV', 'Other'];
const LUGGAGE = ['Available', 'Limited', 'Unavailable'];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1990;
const PLATE_PATTERN = /^[A-Z0-9-]{2,10}$/;

function daysUntil(date) {
  const [year, month, day] = date.split('-').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Math.round(
    (new Date(year, month - 1, day) - today) / 86400000
  );
}

function expiryText(date) {
  if (!date) return 'On file';

  const days = daysUntil(date);

  if (days < 0) return `Expired on ${date}`;
  if (days <= 30) return `Expires in ${days} days`;

  return `Valid until ${date}`;
}

function toForm(vehicle) {
  return {
    type: vehicle.type,
    make: vehicle.make,
    model: vehicle.model,
    colour: vehicle.colour,
    year: String(vehicle.year),
    plateNo: vehicle.plateNo,
    seats: vehicle.seats,
    hasAC: vehicle.hasAC,
    luggage: vehicle.luggage,
  };
}

function validate(form) {
  const errors = {};
  const year = Number(form.year);

  if (!form.make.trim()) {
    errors.make = 'Enter the vehicle make.';
  }

  if (!form.model.trim()) {
    errors.model = 'Enter the vehicle model.';
  }

  if (!form.colour.trim()) {
    errors.colour = 'Enter the vehicle colour.';
  }

  if (
    !Number.isInteger(year) ||
    year < MIN_YEAR ||
    year > CURRENT_YEAR
  ) {
    errors.year = `Enter a year between ${MIN_YEAR} and ${CURRENT_YEAR}.`;
  }

  if (!PLATE_PATTERN.test(form.plateNo)) {
    errors.plateNo = 'Use 2 to 10 letters, numbers or dashes.';
  }

  if (form.seats < 1 || form.seats > 14) {
    errors.seats = 'Seats must be between 1 and 14.';
  }

  return errors;
}

async function selectionHaptic() {
  try {
    await Haptics.selectionAsync();
  } catch (error) {
    // Haptics are optional.
  }
}

/* -------------------------------------------------------
   Press scale wrapper
------------------------------------------------------- */

function PressScale({
  children,
  onPress,
  style,
  disabled = false,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, {
      toValue: 0.97,
      speed: 40,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }

  function pressOut() {
    Animated.spring(scale, {
      toValue: 1,
      speed: 40,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        disabled={disabled}
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={style}
        accessibilityRole={accessibilityRole}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

/* -------------------------------------------------------
   Page background
------------------------------------------------------- */

function PageBackground({ children }) {
  return (
    <LinearGradient
      colors={[T.background, T.gradientEnd]}
      style={styles.background}
    >
      <View pointerEvents="none" style={styles.glowA} />
      <View pointerEvents="none" style={styles.glowB} />
      {children}
    </LinearGradient>
  );
}

/* -------------------------------------------------------
   Icon tile
------------------------------------------------------- */

function IconTile({ name, size = 22 }) {
  return (
    <View style={styles.iconTile}>
      <Icon name={name} size={size} color={T.primary} />
    </View>
  );
}

/* -------------------------------------------------------
   Info row
------------------------------------------------------- */

function InfoRow({
  icon,
  label,
  value,
  last = false,
  onPress,
}) {
  const content = (
    <View style={[styles.infoRow, !last && styles.infoDivider]}>
      <IconTile name={icon} />

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '-'}</Text>
      </View>

      {onPress ? (
        <Icon name="chevron-right" size={22} color={T.muted} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <PressScale
        onPress={onPress}
        style={styles.infoPressable}
        accessibilityLabel={`Open ${label}`}
      >
        {content}
      </PressScale>
    );
  }

  return content;
}

/* -------------------------------------------------------
   Status badge
------------------------------------------------------- */

function StatusBadge({ status }) {
  const color = STATUS[status] || T.inactive;

  return (
    <View style={styles.statusBadge}>
      <View
        style={[styles.statusDot, { backgroundColor: color }]}
      />
      <Text style={[styles.statusText, { color }]}>
        {status}
      </Text>
    </View>
  );
}

/* -------------------------------------------------------
   Reusable buttons
------------------------------------------------------- */

function PrimaryButton({
  title,
  icon,
  onPress,
  disabled = false,
  dark = false,
}) {
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.primaryButton,
        dark && styles.darkButton,
        disabled && styles.disabledButton,
      ]}
      accessibilityLabel={title}
    >
      <Text style={styles.primaryButtonText}>{title}</Text>

      {icon ? (
        <Icon name={icon} size={20} color={T.white} />
      ) : null}
    </PressScale>
  );
}

/* -------------------------------------------------------
   Form field
------------------------------------------------------- */

function FormField({ label, error, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}

      {error ? (
        <Text
          style={styles.fieldError}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/* -------------------------------------------------------
   Input
------------------------------------------------------- */

function VehicleInput({
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  maxLength,
  autoCapitalize,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={T.muted}
      keyboardType={keyboardType || 'default'}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize || 'sentences'}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        styles.input,
        focused && styles.inputFocused,
        error && styles.inputError,
      ]}
      accessibilityLabel={placeholder}
    />
  );
}

/* -------------------------------------------------------
   Selection pill
------------------------------------------------------- */

function Pill({ label, selected, onPress }) {
  return (
    <PressScale
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      style={[
        styles.pill,
        selected && styles.pillSelected,
      ]}
      accessibilityLabel={label}
      accessibilityState={{ selected }}
    >
      <Text
        style={[
          styles.pillText,
          selected && styles.pillTextSelected,
        ]}
      >
        {label}
      </Text>
    </PressScale>
  );
}

/* -------------------------------------------------------
   Animated seat stepper
------------------------------------------------------- */

function SeatStepper({ value, onChange }) {
  const scale = useRef(new Animated.Value(1)).current;

  function changeSeat(next) {
    selectionHaptic();

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.25,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 40,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();

    onChange(next);
  }

  return (
    <View style={styles.stepper}>
      <PressScale
        onPress={() => changeSeat(Math.max(1, value - 1))}
        disabled={value <= 1}
        style={styles.stepperButton}
        accessibilityLabel="Decrease seats"
      >
        <Icon name="minus" size={24} color={T.primary} />
      </PressScale>

      <Animated.Text
        style={[
          styles.stepperValue,
          { transform: [{ scale }] },
        ]}
        accessibilityLabel={`${value} passenger seats`}
      >
        {value}
      </Animated.Text>

      <PressScale
        onPress={() => changeSeat(Math.min(14, value + 1))}
        disabled={value >= 14}
        style={styles.stepperButton}
        accessibilityLabel="Increase seats"
      >
        <Icon name="plus" size={24} color={T.primary} />
      </PressScale>
    </View>
  );
}

/* -------------------------------------------------------
   Edit vehicle bottom sheet
------------------------------------------------------- */

function EditSheet({
  visible,
  vehicle,
  onClose,
  onSave,
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const slide = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState(toForm(vehicle));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      setForm(toForm(vehicle));
      setErrors({});
      setSubmitted(false);
      setMounted(true);

      slide.setValue(reduceMotion ? 0 : height);
      fade.setValue(0);

      Animated.parallel([
        Animated.timing(slide, {
          toValue: 0,
          duration: reduceMotion ? 150 : 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: reduceMotion ? 0 : height,
          duration: reduceMotion ? 150 : 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  function update(patch) {
    setForm((previous) => ({ ...previous, ...patch }));
  }

  function handleClose() {
    if (!saving) onClose();
  }

  async function handleSave() {
    setSubmitted(true);

    const found = validate(form);
    setErrors(found);

    if (Object.keys(found).length > 0) return;

    setSaving(true);

    try {
      await onSave({
        type: form.type,
        make: form.make.trim(),
        model: form.model.trim(),
        colour: form.colour.trim(),
        year: Number(form.year),
        plateNo: form.plateNo,
        seats: form.seats,
        hasAC: form.hasAC,
        luggage: form.luggage,
      });
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        submit: getErrorMessage(error),
      }));
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.sheetRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[styles.backdrop, { opacity: fade }]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close edit vehicle form"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: height * 0.88,
              transform: [{ translateY: slide }],
            },
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Edit vehicle</Text>

            <TouchableOpacity
              onPress={handleClose}
              disabled={saving}
              style={styles.cancelButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing"
            >
              <Text style={styles.link}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.sheetBody,
              { paddingBottom: insets.bottom + 40 },
            ]}
          >
            <FormField label="Vehicle type">
              <View style={styles.pillRow}>
                {TYPES.map((item) => (
                  <Pill
                    key={item}
                    label={item}
                    selected={form.type === item}
                    onPress={() => update({ type: item })}
                  />
                ))}
              </View>
            </FormField>

            <FormField label="Make" error={errors.make}>
              <VehicleInput
                value={form.make}
                onChangeText={(value) => update({ make: value })}
                placeholder="e.g. Toyota"
                error={errors.make}
              />
            </FormField>

            <FormField label="Model" error={errors.model}>
              <VehicleInput
                value={form.model}
                onChangeText={(value) => update({ model: value })}
                placeholder="e.g. Axio"
                error={errors.model}
              />
            </FormField>

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <FormField label="Colour" error={errors.colour}>
                  <VehicleInput
                    value={form.colour}
                    onChangeText={(value) => update({ colour: value })}
                    placeholder="White"
                    error={errors.colour}
                  />
                </FormField>
              </View>

              <View style={styles.column}>
                <FormField label="Year" error={errors.year}>
                  <VehicleInput
                    value={form.year}
                    keyboardType="number-pad"
                    maxLength={4}
                    onChangeText={(value) =>
                      update({
                        year: value.replace(/[^0-9]/g, ''),
                      })
                    }
                    placeholder={String(CURRENT_YEAR)}
                    error={errors.year}
                  />
                </FormField>
              </View>
            </View>

            <FormField label="Plate number" error={errors.plateNo}>
              <VehicleInput
                value={form.plateNo}
                autoCapitalize="characters"
                maxLength={10}
                onChangeText={(value) =>
                  update({
                    plateNo: value.toUpperCase().replace(/\s+/g, ''),
                  })
                }
                placeholder="ABC1234"
                error={errors.plateNo}
              />
            </FormField>

            <FormField label="Passenger seats" error={errors.seats}>
              <SeatStepper
                value={form.seats}
                onChange={(seats) => update({ seats })}
              />
            </FormField>

            <View style={styles.switchCard}>
              <IconTile name="snowflake" />

              <View style={styles.switchContent}>
                <Text style={styles.switchTitle}>
                  Air conditioning
                </Text>
                <Text style={styles.switchHint}>
                  {form.hasAC ? 'Available' : 'Not available'}
                </Text>
              </View>

              <Switch
                value={form.hasAC}
                onValueChange={(value) => {
                  selectionHaptic();
                  update({ hasAC: value });
                }}
                trackColor={{
                  true: T.primary,
                  false: T.border,
                }}
                thumbColor={T.white}
                accessibilityRole="switch"
                accessibilityLabel="Air conditioning"
                accessibilityState={{ checked: form.hasAC }}
              />
            </View>

            <FormField label="Luggage space">
              <View style={styles.pillRow}>
                {LUGGAGE.map((item) => (
                  <Pill
                    key={item}
                    label={item}
                    selected={form.luggage === item}
                    onPress={() => update({ luggage: item })}
                  />
                ))}
              </View>
            </FormField>

            {errors.submit ? (
              <View style={styles.alert}>
                <Icon name="alert-circle" size={22} color={T.danger} />
                <Text style={styles.alertText}>
                  {errors.submit}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.darkButton,
                saving && styles.disabledButton,
              ]}
              onPress={handleSave}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save changes"
            >
              {saving ? (
                <ActivityIndicator color={T.white} />
              ) : (
                <Text style={styles.primaryButtonText}>
                  Save changes
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* -------------------------------------------------------
   Vehicle details page
------------------------------------------------------- */

export default function VehicleDetailsScreen() {
  const insets = useSafeAreaInsets();

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');

  const loadVehicle = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await getMyVehicle();
      setVehicle(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVehicle();
  }, [loadVehicle]);

  async function handleSave(patch) {
    const updated = await updateVehicle(vehicle._id, patch);

    setVehicle((previous) => ({
      ...previous,
      ...updated,
    }));

    setEditing(false);
    setNotice('Changes saved.');
  }

  function openDocument(title, fileKey) {
    // TODO: Replace with a document preview or signed URL API.
    alert(`${title}\n${fileKey || 'Document unavailable'}`);
  }

  if (loading) {
    return (
      <PageBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.primary} />
          <Text style={styles.loadingText}>Loading vehicle details...</Text>
        </View>
      </PageBackground>
    );
  }

  if (error || !vehicle) {
    return (
      <PageBackground>
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Icon name="alert-circle-outline" size={42} color={T.primary} />
          </View>

          <Text style={styles.emptyTitle}>
            Unable to load vehicle
          </Text>

          <Text style={styles.emptyDescription}>
            {error || 'Your vehicle information could not be found.'}
          </Text>

          <PrimaryButton
            title="Try again"
            icon="refresh"
            onPress={loadVehicle}
            dark
          />
        </View>
      </PageBackground>
    );
  }

  const documents = vehicle.documents || {};

  return (
    <PageBackground>
      <View style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.container,
            { paddingBottom: insets.bottom + 120 },
          ]}
        >
          {/* Header */}

          <View style={styles.topBar}>
            <View style={styles.topBarIcon}>
              <Icon name="car-outline" size={23} color={T.primary} />
            </View>

            <Text style={styles.topBarTitle}>Vehicle details</Text>

            <StatusBadge status={vehicle.status} />
          </View>

          {/* Vehicle photo */}

          <View style={styles.heroCard}>
            <View style={styles.vehicleImageWrapper}>
              {vehicle.photoUrl ? (
                <Image
                  source={{ uri: vehicle.photoUrl }}
                  style={styles.vehicleImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.imagePlaceholder}>
                  <Icon name="car" size={64} color={T.primary} />
                </View>
              )}
            </View>

            <Text style={styles.vehicleName}>
              {vehicle.make} {vehicle.model}
            </Text>

            <Text style={styles.vehicleSubtitle}>
              {vehicle.type} · {vehicle.year}
            </Text>

            <View style={styles.plateBadge}>
              <Icon name="card-account-details-outline" size={18} color={T.secondary} />
              <Text style={styles.plateText}>
                {vehicle.plateNo}
              </Text>
            </View>

            <View style={styles.heroStatus}>
              <StatusBadge status={vehicle.status} />
            </View>

            {notice ? (
              <View style={styles.successMessage}>
                <Icon name="check-circle" size={18} color={T.approved} />
                <Text style={styles.successText}>{notice}</Text>
              </View>
            ) : null}

            <PrimaryButton
              title="Edit vehicle"
              icon="pencil-outline"
              onPress={() => {
                setNotice('');
                setEditing(true);
              }}
            />
          </View>

          {/* Rejection alert */}

          {vehicle.status === 'Rejected' && vehicle.rejectionReason ? (
            <View style={styles.alert}>
              <Icon name="alert-circle-outline" size={24} color={T.danger} />
              <View style={styles.alertContent}>
                <Text style={styles.alertTitle}>
                  Vehicle review rejected
                </Text>
                <Text style={styles.alertText}>
                  {vehicle.rejectionReason}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Vehicle information */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vehicle information</Text>
            <Text style={styles.sectionCaption}>
              Your registered vehicle details
            </Text>
          </View>

          <View style={styles.card}>
            <InfoRow
              icon="car-outline"
              label="Vehicle type"
              value={vehicle.type}
            />

            <InfoRow
              icon="card-account-details-outline"
              label="Plate number"
              value={vehicle.plateNo}
            />

            <InfoRow
              icon="palette-outline"
              label="Colour"
              value={vehicle.colour}
            />

            <InfoRow
              icon="calendar-outline"
              label="Manufacture year"
              value={String(vehicle.year)}
            />

            <InfoRow
              icon="account-group-outline"
              label="Passenger seats"
              value={`${vehicle.seats} seats`}
            />

            <InfoRow
              icon="snowflake"
              label="Air conditioning"
              value={vehicle.hasAC ? 'Available' : 'Not available'}
            />

            <InfoRow
              icon="bag-suitcase-outline"
              label="Luggage space"
              value={vehicle.luggage}
              last
            />
          </View>

          {/* Documents */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Vehicle documents</Text>
            <Text style={styles.sectionCaption}>
              Your uploaded verification documents
            </Text>
          </View>

          <View style={styles.card}>
            <InfoRow
              icon="file-pdf-box"
              label="Registration certificate"
              value="Document uploaded"
              onPress={() =>
                openDocument(
                  'Registration certificate',
                  documents.registration?.fileKey
                )
              }
            />

            <InfoRow
              icon="file-document-outline"
              label="Revenue licence"
              value={expiryText(documents.revenueLicence?.expiry)}
              onPress={() =>
                openDocument(
                  'Revenue licence',
                  documents.revenueLicence?.fileKey
                )
              }
            />

            <InfoRow
              icon="shield-check-outline"
              label="Insurance certificate"
              value={expiryText(documents.insurance?.expiry)}
              last
              onPress={() =>
                openDocument(
                  'Insurance certificate',
                  documents.insurance?.fileKey
                )
              }
            />
          </View>

          {/* Registration information */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Registration information</Text>
          </View>

          <View style={styles.card}>
            <InfoRow
              icon="clock-outline"
              label="Registered on"
              value={new Date(vehicle.createdAt).toLocaleDateString()}
            />

            <InfoRow
              icon="update"
              label="Last updated"
              value={new Date(vehicle.updatedAt).toLocaleDateString()}
              last
            />
          </View>

        </ScrollView>

        {/* Edit bottom sheet */}

        <EditSheet
          visible={editing}
          vehicle={vehicle}
          onClose={() => setEditing(false)}
          onSave={handleSave}
        />
      </View>
    </PageBackground>
  );
}

/* -------------------------------------------------------
   Styles
------------------------------------------------------- */

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  glowA: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: T.radius.pill,
    backgroundColor: T.accent,
    opacity: 0.28,
    top: -80,
    right: -70,
  },

  glowB: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: T.radius.pill,
    backgroundColor: T.primary,
    opacity: 0.10,
    bottom: 120,
    left: -100,
  },

  container: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    paddingHorizontal: T.space.xl,
    paddingTop: T.space.md,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: T.space.xxxl,
  },

  loadingText: {
    color: T.muted,
    fontSize: 14,
    marginTop: T.space.lg,
  },

  topBar: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: T.space.xl,
    gap: T.space.md,
  },

  topBarIcon: {
    width: 44,
    height: 44,
    borderRadius: T.radius.md,
    backgroundColor: T.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...T.shadow,
  },

  topBarTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: T.secondary,
  },

  heroCard: {
    backgroundColor: T.white,
    borderRadius: T.radius.lg,
    padding: T.space.xl,
    alignItems: 'center',
    ...T.shadow,
  },

  vehicleImageWrapper: {
    width: '100%',
    height: 190,
    borderRadius: T.radius.lg,
    overflow: 'hidden',
    backgroundColor: T.tint,
  },

  vehicleImage: {
    width: '100%',
    height: '100%',
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.tint,
  },

  vehicleName: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: T.text,
    marginTop: T.space.xl,
    textAlign: 'center',
  },

  vehicleSubtitle: {
    fontSize: 15,
    color: T.muted,
    marginTop: T.space.xs,
  },

  plateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.space.sm,
    backgroundColor: T.tint,
    borderRadius: T.radius.pill,
    paddingHorizontal: T.space.lg,
    paddingVertical: T.space.md,
    marginTop: T.space.lg,
  },

  plateText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    color: T.secondary,
  },

  heroStatus: {
    marginTop: T.space.lg,
    marginBottom: T.space.lg,
  },

  statusBadge: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.space.sm,
    paddingHorizontal: T.space.md,
    borderRadius: T.radius.pill,
    backgroundColor: T.tint,
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: T.radius.pill,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  primaryButton: {
    width: '100%',
    minHeight: 54,
    borderRadius: T.radius.md,
    backgroundColor: T.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: T.space.md,
    paddingHorizontal: T.space.lg,
  },

  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: T.white,
  },

  darkButton: {
    minHeight: 54,
    borderRadius: T.radius.md,
    backgroundColor: T.text,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: T.space.md,
    paddingHorizontal: T.space.lg,
  },

  disabledButton: {
    opacity: 0.45,
  },

  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.space.sm,
    marginBottom: T.space.lg,
  },

  successText: {
    color: T.approved,
    fontWeight: '700',
    fontSize: 13,
  },

  sectionHeader: {
    marginTop: T.space.xxl,
    marginBottom: T.space.md,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: T.secondary,
  },

  sectionCaption: {
    fontSize: 13,
    color: T.muted,
    marginTop: T.space.xs,
  },

  card: {
    backgroundColor: T.white,
    borderRadius: T.radius.lg,
    paddingHorizontal: T.space.lg,
    paddingVertical: T.space.xs,
    ...T.shadow,
  },

  infoPressable: {
    minHeight: 72,
  },

  infoRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: T.space.md,
  },

  infoDivider: {
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },

  iconTile: {
    width: 44,
    height: 44,
    borderRadius: T.radius.sm,
    backgroundColor: T.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoContent: {
    flex: 1,
    justifyContent: 'center',
    gap: T.space.xs,
  },

  infoLabel: {
    fontSize: 13,
    color: T.muted,
    fontWeight: '500',
  },

  infoValue: {
    fontSize: 16,
    color: T.text,
    fontWeight: '600',
  },

  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: T.space.md,
    backgroundColor: T.dangerSoft,
    borderWidth: 1,
    borderColor: T.dangerBorder,
    borderRadius: T.radius.md,
    padding: T.space.lg,
    marginTop: T.space.lg,
  },

  alertContent: {
    flex: 1,
  },

  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: T.dangerText,
    marginBottom: T.space.xs,
  },

  alertText: {
    color: T.dangerText,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },

  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: T.radius.pill,
    backgroundColor: T.tint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: T.space.xl,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: T.secondary,
    marginBottom: T.space.sm,
  },

  emptyDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: T.muted,
    textAlign: 'center',
    marginBottom: T.space.xl,
  },

  /* Bottom sheet */

  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(36,33,59,0.45)',
  },

  sheet: {
    backgroundColor: T.background,
    borderTopLeftRadius: T.radius.lg,
    borderTopRightRadius: T.radius.lg,
    paddingTop: T.space.md,
    overflow: 'hidden',
  },

  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: T.radius.pill,
    backgroundColor: T.border,
    marginBottom: T.space.lg,
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: T.space.xl,
    paddingBottom: T.space.lg,
  },

  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: T.secondary,
  },

  cancelButton: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },

  link: {
    color: T.primary,
    fontSize: 15,
    fontWeight: '700',
  },

  sheetBody: {
    paddingHorizontal: T.space.xl,
  },

  field: {
    marginBottom: T.space.lg,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: T.text,
    marginBottom: T.space.sm,
  },

  fieldError: {
    fontSize: 13,
    fontWeight: '600',
    color: T.danger,
    marginTop: T.space.xs,
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radius.md,
    backgroundColor: T.white,
    paddingHorizontal: T.space.lg,
    fontSize: 16,
    color: T.text,
  },

  inputFocused: {
    borderColor: T.primary,
    borderWidth: 1.5,
  },

  inputError: {
    borderColor: T.danger,
  },

  twoColumns: {
    flexDirection: 'row',
    gap: T.space.md,
  },

  column: {
    flex: 1,
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: T.space.sm,
  },

  pill: {
    minHeight: 44,
    borderRadius: T.radius.pill,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.white,
    paddingHorizontal: T.space.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },

  pillSelected: {
    backgroundColor: T.tint,
    borderWidth: 1.5,
    borderColor: T.primary,
  },

  pillText: {
    fontSize: 14,
    fontWeight: '600',
    color: T.text,
  },

  pillTextSelected: {
    color: T.primary,
    fontWeight: '700',
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: T.space.xl,
  },

  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: T.radius.pill,
    backgroundColor: T.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },

  stepperValue: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '800',
    color: T.text,
  },

  switchCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: T.white,
    borderRadius: T.radius.md,
    padding: T.space.md,
    gap: T.space.md,
    marginBottom: T.space.lg,
  },

  switchContent: {
    flex: 1,
  },

  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: T.text,
  },

  switchHint: {
    fontSize: 13,
    color: T.muted,
    marginTop: T.space.xs,
  },
});
 