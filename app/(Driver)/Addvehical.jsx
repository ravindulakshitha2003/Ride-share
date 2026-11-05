/**
 * addVehical.jsx
 * ---------------------------------------------------------------------------
 * Self-contained "Add Vehicle" wizard + "My Vehicles" list + details screen.
 * JavaScript only. No backend: a mock API with dummy data lives in this file.
 *
 * PLACE AT:   app/addVehical.jsx   (Expo Router route: /addVehical)
 *
 * INSTALL (only what is missing):
 *   npx expo install expo-linear-gradient expo-image-picker expo-document-picker \
 *     expo-haptics @react-native-community/datetimepicker react-native-safe-area-context \
 *     @expo/vector-icons
 *
 * app.json (permissions for camera / photos):
 *   "plugins": [
 *     ["expo-image-picker", {
 *       "photosPermission": "Allow access to your photos to add vehicle pictures.",
 *       "cameraPermission": "Allow camera access to take vehicle pictures."
 *     }]
 *   ]
 *
 * NOTES
 * - Animations use React Native's built-in Animated API (no Reanimated/babel setup).
 * - Validation is written as plain functions (no zod) so the file has no extra deps.
 * - Owner id: pass `ownerId` as a prop, or replace OWNER_FALLBACK with your
 *   useAuth() user id (see the marked line inside AddVehicleModule).
 * - To use a real backend later: replace the `api` object (search "MOCK API").
 */

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useReducer,
  memo,
} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  FlatList,
  Image,
  Animated,
  Easing,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  RefreshControl,
  AccessibilityInfo,
  Alert,
  Dimensions,
  findNodeHandle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

/* ===========================================================================
 * 1. THEME TOKENS
 * ========================================================================= */
const C = {
  primary: '#5B4BDB',
  secondary: '#312E81',
  accent: '#F0ABFC',
  background: '#F8F7FF',
  text: '#24213B',
  textMuted: 'rgba(36,33,59,0.6)',
  white: '#FFFFFF',
  border: '#E4E1F5',
  tint: '#EEEBFF',
  gradientEnd: '#E9E4FF',
  danger: '#DC2626',
  dangerSoft: '#FEF2F2',
  status: {
    pending: '#F59E0B',
    approved: '#16A34A',
    rejected: '#DC2626',
    inactive: '#6B7280',
    expired: '#EA580C',
  },
};
const R = { sm: 12, md: 16, lg: 24, xl: 28, pill: 999 };
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const SHADOW = Platform.select({
  ios: {
    shadowColor: C.primary,
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 6, shadowColor: C.primary },
  default: {},
});
const MAX_W = 560;
const TOTAL_STEPS = 6;
const MIN_YEAR = 1990;
const CURRENT_YEAR = new Date().getFullYear();
const PLATE_RE = /^[A-Z0-9-]{2,10}$/;

/* ===========================================================================
 * 2. HELPERS
 * ========================================================================= */
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
};
const daysUntil = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
};
const fmtSize = (b) => {
  if (!b) return '';
  return b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`;
};
const expiryInfo = (iso) => {
  if (!iso) return { text: 'No expiry date', color: C.textMuted };
  const n = daysUntil(iso);
  if (n < 0) return { text: `Expired ${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} ago`, color: C.status.expired };
  if (n === 0) return { text: 'Expires today', color: C.status.pending };
  if (n <= 30) return { text: `Expires in ${n} day${n === 1 ? '' : 's'}`, color: C.status.pending };
  return { text: `Valid until ${iso}`, color: C.status.approved };
};
const tap = () => {
  try {
    Haptics.selectionAsync();
  } catch (e) {
    /* haptics unavailable */
  }
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setReduced(!!v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub && sub.remove && sub.remove();
    };
  }, []);
  return reduced;
}

/* ===========================================================================
 * 3. MOCK API  (replace this block with real fetch calls later)
 * ========================================================================= */
const API_CONFIG = { USE_MOCK: true, SIMULATE_FAILURE: false };
const wait = (min, max = min) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
const photo = (seed) => `photos/dummy/${seed}.jpg`;

const DUMMY_VEHICLES = [
  {
    _id: 'veh_001', ownerId: 'user_001', type: 'Car', make: 'Toyota', model: 'Axio', colour: 'White',
    year: 2018, plateNo: 'ABC1234', seats: 4, hasAC: true, luggage: 'Available',
    documents: {
      registration: { fileKey: 'docs/registration/axio-reg.pdf' },
      revenueLicence: { fileKey: 'docs/revenueLicence/axio-rev.pdf', expiry: addDays(240) },
      insurance: { fileKey: 'docs/insurance/axio-ins.pdf', expiry: addDays(300) },
    },
    photoKeys: [photo('axio-front'), photo('axio-side')],
    status: 'Approved', createdAt: '2026-08-01T09:00:00.000Z', updatedAt: '2026-08-03T09:00:00.000Z',
  },
  {
    _id: 'veh_002', ownerId: 'user_001', type: 'Van', make: 'Toyota', model: 'HiAce', colour: 'Silver',
    year: 2016, plateNo: 'CAB5678', seats: 12, hasAC: true, luggage: 'Limited',
    documents: {
      registration: { fileKey: 'docs/registration/hiace-reg.pdf' },
      revenueLicence: { fileKey: 'docs/revenueLicence/hiace-rev.pdf', expiry: addDays(12) },
      insurance: { fileKey: 'docs/insurance/hiace-ins.pdf', expiry: addDays(180) },
    },
    photoKeys: [photo('hiace-front'), photo('hiace-side')],
    status: 'Pending', createdAt: '2026-10-20T09:00:00.000Z', updatedAt: '2026-10-20T09:00:00.000Z',
  },
  {
    _id: 'veh_003', ownerId: 'user_001', type: 'SUV', make: 'Mitsubishi', model: 'Montero', colour: 'Black',
    year: 2020, plateNo: 'KX9021', seats: 7, hasAC: true, luggage: 'Available',
    documents: {
      registration: { fileKey: 'docs/registration/montero-reg.pdf' },
      revenueLicence: { fileKey: 'docs/revenueLicence/montero-rev.pdf', expiry: addDays(200) },
      insurance: { fileKey: 'docs/insurance/montero-ins.pdf', expiry: addDays(150) },
    },
    photoKeys: [photo('montero-front'), photo('montero-side')],
    status: 'Rejected', reviewedBy: 'admin_01',
    rejectionReason: 'Insurance document is unclear. Please re-upload a clear copy.',
    createdAt: '2026-09-10T09:00:00.000Z', updatedAt: '2026-09-12T09:00:00.000Z',
  },
  {
    _id: 'veh_004', ownerId: 'user_001', type: 'Car', make: 'Suzuki', model: 'Alto', colour: 'Red',
    year: 2012, plateNo: 'WP4455', seats: 4, hasAC: false, luggage: 'Unavailable',
    documents: {
      registration: { fileKey: 'docs/registration/alto-reg.pdf' },
      revenueLicence: { fileKey: 'docs/revenueLicence/alto-rev.pdf', expiry: addDays(90) },
      insurance: { fileKey: 'docs/insurance/alto-ins.pdf', expiry: addDays(90) },
    },
    photoKeys: [photo('alto-front'), photo('alto-side')],
    status: 'Inactive', createdAt: '2026-05-05T09:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z',
  },
  {
    _id: 'veh_005', ownerId: 'user_001', type: 'Van', make: 'Nissan', model: 'Caravan', colour: 'Blue',
    year: 2015, plateNo: 'NB7788', seats: 10, hasAC: true, luggage: 'Limited',
    documents: {
      registration: { fileKey: 'docs/registration/caravan-reg.pdf' },
      revenueLicence: { fileKey: 'docs/revenueLicence/caravan-rev.pdf', expiry: addDays(60) },
      insurance: { fileKey: 'docs/insurance/caravan-ins.pdf', expiry: addDays(-30) },
    },
    photoKeys: [photo('caravan-front'), photo('caravan-side')],
    status: 'Expired', createdAt: '2025-11-01T09:00:00.000Z', updatedAt: '2026-10-01T09:00:00.000Z',
  },
];

const MAKES = {
  Toyota: ['Axio', 'Aqua', 'Prius', 'HiAce', 'Corolla', 'Land Cruiser'],
  Honda: ['Civic', 'Fit', 'Vezel', 'CR-V'],
  Nissan: ['Leaf', 'Caravan', 'X-Trail', 'Sunny'],
  Suzuki: ['Alto', 'Wagon R', 'Swift', 'Every'],
  Mitsubishi: ['Montero', 'Lancer', 'Outlander'],
  Mazda: ['Mazda 3', 'CX-5', 'Demio'],
  Hyundai: ['Elantra', 'Tucson', 'Santa Fe'],
  Kia: ['Picanto', 'Sportage', 'Sorento'],
  BMW: ['3 Series', '5 Series', 'X5'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC'],
};

const LOCAL_URIS = {};
let DB = [...DUMMY_VEHICLES];

const api = {
  async listVehicles() {
    await wait(300, 600);
    return [...DB];
  },
  async getVehicle(id) {
    await wait(200, 400);
    return DB.find((v) => v._id === id) || null;
  },
  async isPlateTaken(plateNo) {
    await wait(350, 600);
    return DB.some((v) => v.plateNo === plateNo);
  },
  async createVehicle(payload, ownerId) {
    await wait(800);
    if (API_CONFIG.SIMULATE_FAILURE) throw new Error('Network error. Please try again.');
    if (DB.some((v) => v.plateNo === payload.plateNo)) {
      const e = new Error('This plate number is already registered.');
      e.code = 'DUPLICATE_PLATE';
      throw e;
    }
    const now = new Date().toISOString();
    const vehicle = {
      ...payload,
      _id: `veh_${Date.now()}`,
      ownerId,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    };
    DB = [vehicle, ...DB];
    return vehicle;
  },
  async uploadFile(localUri, kind, onProgress) {
    for (let i = 1; i <= 10; i += 1) {
      await wait(120);
      onProgress && onProgress(i * 10);
    }
    const isPhoto = ['front', 'side', 'extra'].includes(kind);
    const ext = (localUri.split('?')[0].split('.').pop() || (isPhoto ? 'jpg' : 'pdf')).slice(0, 4);
    const fileKey = `${isPhoto ? 'photos' : 'docs'}/${kind}/${Math.random().toString(36).slice(2, 8)}.${ext}`;
    LOCAL_URIS[fileKey] = localUri;
    return { fileKey };
  },
  getFileUrl(fileKey) {
    if (!fileKey) return null;
    if (LOCAL_URIS[fileKey]) return LOCAL_URIS[fileKey];
    if (fileKey.startsWith('photos/')) {
      const seed = fileKey.split('/').pop().replace(/\.\w+$/, '');
      return `https://picsum.photos/seed/${seed}/800/500`;
    }
    return null;
  },
};

/* ===========================================================================
 * 4. FORM STATE (Context-free reducer, kept inside the wizard)
 * ========================================================================= */
const initialForm = {
  type: '',
  make: '',
  model: '',
  colour: '',
  colourOther: '',
  year: CURRENT_YEAR,
  plateNo: '',
  seats: 4,
  hasAC: true,
  luggage: 'Available',
  docs: { registration: null, revenueLicence: null, insurance: null },
  photos: { front: null, side: null, e0: null, e1: null, e2: null, e3: null },
};

function formReducer(state, action) {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'doc':
      return {
        ...state,
        docs: {
          ...state.docs,
          [action.key]: action.patch === null ? null : { ...(state.docs[action.key] || {}), ...action.patch },
        },
      };
    case 'photo':
      return {
        ...state,
        photos: {
          ...state.photos,
          [action.key]: action.patch === null ? null : { ...(state.photos[action.key] || {}), ...action.patch },
        },
      };
    case 'reset':
      return initialForm;
    default:
      return state;
  }
}

/* ===========================================================================
 * 5. VALIDATION (one function per step; returns { field: message })
 * ========================================================================= */
const DOC_LABELS = {
  registration: 'Registration document',
  revenueLicence: 'Revenue licence',
  insurance: 'Insurance',
};

function validateStep(step, f, plateState) {
  const e = {};
  if (step === 1) {
    if (!f.type) e.type = 'Choose a vehicle type';
  }
  if (step === 2) {
    if (!f.make.trim()) e.make = 'Enter the make';
    if (!f.model.trim()) e.model = 'Enter the model';
    if (!f.colour) e.colour = 'Pick a colour';
    else if (f.colour === 'Other' && !f.colourOther.trim()) e.colour = 'Type the colour name';
    if (!Number.isInteger(f.year) || f.year < MIN_YEAR || f.year > CURRENT_YEAR)
      e.year = `Year must be ${MIN_YEAR} to ${CURRENT_YEAR}`;
  }
  if (step === 3) {
    if (!f.plateNo) e.plateNo = 'Enter the plate number';
    else if (plateState === 'invalid') e.plateNo = 'Use 2 to 10 letters, numbers or dashes';
    else if (plateState === 'taken') e.plateNo = 'This plate is already registered';
    else if (plateState !== 'free') e.plateNo = 'Checking plate number...';
    if (!Number.isInteger(f.seats) || f.seats < 1 || f.seats > 14) e.seats = 'Seats must be 1 to 14';
  }
  if (step === 4) {
    Object.keys(DOC_LABELS).forEach((k) => {
      const d = f.docs[k];
      if (!d || d.uploading || !d.fileKey) {
        e[k] = d && d.uploading ? 'Uploading...' : `Upload your ${DOC_LABELS[k].toLowerCase()}`;
      } else if (k !== 'registration') {
        if (!d.expiry) e[k] = 'Pick an expiry date';
        else if (daysUntil(d.expiry) <= 0) e[k] = 'Expiry must be a future date';
      }
    });
  }
  if (step === 5) {
    if (!f.photos.front || !f.photos.front.fileKey) e.front = 'Add a front photo';
    if (!f.photos.side || !f.photos.side.fileKey) e.side = 'Add a side photo';
    Object.values(f.photos).forEach((p) => {
      if (p && p.uploading) e.uploading = 'Photos are still uploading...';
    });
  }
  return e;
}

/* ===========================================================================
 * 6. UI PRIMITIVES
 * ========================================================================= */
function GradientScreen({ children }) {
  return (
    <LinearGradient colors={[C.background, C.gradientEnd]} style={S.flex}>
      <View pointerEvents="none" style={S.glowA} />
      <View pointerEvents="none" style={S.glowB} />
      {children}
    </LinearGradient>
  );
}

const Card = ({ children, style }) => <View style={[S.card, style]}>{children}</View>;

function PressScale({ onPress, disabled, style, children, label, role = 'button', state }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={state || { disabled: !!disabled }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

function PrimaryButton({ title, onPress, disabled, loading, dark, icon, style }) {
  return (
    <PressScale
      onPress={onPress}
      disabled={disabled || loading}
      label={title}
      style={[
        S.btn,
        { backgroundColor: dark ? C.text : C.primary },
        (disabled || loading) && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={C.white} />
      ) : (
        <View style={S.row}>
          <Text style={S.btnText}>{title}</Text>
          {icon ? <Icon name={icon} size={20} color={C.white} style={{ marginLeft: SP.sm }} /> : null}
        </View>
      )}
    </PressScale>
  );
}

const Chip = memo(function Chip({ label, selected, onPress, icon, small }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress && onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      style={[S.chip, small && S.chipSmall, selected && S.chipOn]}
    >
      {icon ? <Icon name={icon} size={14} color={selected ? C.primary : C.textMuted} style={{ marginRight: 4 }} /> : null}
      <Text style={[S.chipText, selected && { color: C.primary, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
});

function PopCheck({ size = 22 }) {
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(s, { toValue: 1, useNativeDriver: true, bounciness: 14, speed: 14 }).start();
  }, [s]);
  return (
    <Animated.View style={[S.checkBadge, { width: size, height: size, borderRadius: size / 2, transform: [{ scale: s }] }]}>
      <Icon name="check" size={size - 8} color={C.white} />
    </Animated.View>
  );
}

function OptionCard({ label, icon, selected, onPress }) {
  return (
    <PressScale
      onPress={() => {
        tap();
        onPress();
      }}
      label={`${label} vehicle`}
      role="radio"
      state={{ selected: !!selected }}
      style={[S.optionCard, selected && S.optionOn]}
    >
      {selected ? (
        <View style={S.checkPos}>
          <PopCheck />
        </View>
      ) : null}
      <View style={[S.optionIcon, selected && { backgroundColor: C.primary }]}>
        <Icon name={icon} size={34} color={selected ? C.white : C.primary} />
      </View>
      <Text style={[S.optionLabel, selected && { color: C.primary }]}>{label}</Text>
    </PressScale>
  );
}

function Field({ label, value, onChangeText, placeholder, error, autoCapitalize, maxLength, right, a11yHint }) {
  const [focus, setFocus] = useState(false);
  const showErr = !!error && String(value || '').length > 0;
  return (
    <View style={{ marginBottom: SP.lg }}>
      <Text style={S.label}>{label}</Text>
      <View style={[S.input, focus && { borderColor: C.primary }, showErr && { borderColor: C.danger }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMuted}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          autoCapitalize={autoCapitalize || 'words'}
          maxLength={maxLength}
          style={S.inputText}
          accessibilityLabel={label}
          accessibilityHint={a11yHint}
        />
        {right}
      </View>
      {showErr ? (
        <Text style={S.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <View style={S.segWrap} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o === value;
        return (
          <Pressable
            key={o}
            onPress={() => {
              tap();
              onChange(o);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o}
            style={[S.seg, on && S.segOn]}
          >
            <Text style={[S.segText, on && { color: C.white }]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Toggle({ value, onChange, label }) {
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, useNativeDriver: true, bounciness: 10, speed: 16 }).start();
  }, [value, x]);
  return (
    <Pressable
      onPress={() => {
        tap();
        onChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      style={[S.toggleTrack, { backgroundColor: value ? C.primary : C.border }]}
    >
      <Animated.View
        style={[S.toggleThumb, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 28] }) }] }]}
      />
    </Pressable>
  );
}

function SeatStepper({ value, onChange }) {
  const bump = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(bump, { toValue: 1.25, duration: 90, useNativeDriver: true }),
      Animated.spring(bump, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
    ]).start();
  }, [value, bump]);
  const step = (d) => {
    const n = Math.min(14, Math.max(1, value + d));
    if (n !== value) {
      tap();
      onChange(n);
    }
  };
  return (
    <View style={S.stepperRow}>
      <Pressable
        onPress={() => step(-1)}
        disabled={value <= 1}
        accessibilityRole="button"
        accessibilityLabel="Decrease seats"
        style={[S.roundBtn, value <= 1 && { opacity: 0.35 }]}
      >
        <Icon name="minus" size={26} color={C.primary} />
      </Pressable>
      <Animated.View style={{ transform: [{ scale: bump }], alignItems: 'center', minWidth: 90 }}>
        <Text style={S.bigNumber} accessibilityLiveRegion="polite" accessibilityLabel={`${value} seats`}>
          {value}
        </Text>
        <Text style={S.muted}>seats</Text>
      </Animated.View>
      <Pressable
        onPress={() => step(1)}
        disabled={value >= 14}
        accessibilityRole="button"
        accessibilityLabel="Increase seats"
        style={[S.roundBtn, value >= 14 && { opacity: 0.35 }]}
      >
        <Icon name="plus" size={26} color={C.primary} />
      </Pressable>
    </View>
  );
}

const SWATCHES = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Black', hex: '#1F1F2B' },
  { name: 'Silver', hex: '#C4C7CF' },
  { name: 'Grey', hex: '#7B7F8C' },
  { name: 'Red', hex: '#E5484D' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Green', hex: '#22A06B' },
  { name: 'Yellow', hex: '#F5C518' },
  { name: 'Other', hex: null },
];

function SwatchRow({ value, onChange }) {
  return (
    <View style={S.swatchWrap}>
      {SWATCHES.map((s) => {
        const on = s.name === value;
        return (
          <Pressable
            key={s.name}
            onPress={() => {
              tap();
              onChange(s.name);
            }}
            accessibilityRole="radio"
            accessibilityLabel={`${s.name} colour`}
            accessibilityState={{ selected: on }}
            style={S.swatchItem}
          >
            <View style={[S.swatchRing, on && { borderColor: C.primary }]}>
              {s.hex ? (
                <View style={[S.swatchDot, { backgroundColor: s.hex }, s.name === 'White' && { borderWidth: 1, borderColor: C.border }]} />
              ) : (
                <View style={[S.swatchDot, { backgroundColor: C.tint }]}>
                  <Icon name="plus" size={18} color={C.primary} />
                </View>
              )}
            </View>
            <Text style={[S.swatchLabel, on && { color: C.primary, fontWeight: '700' }]}>{s.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StatusBadge({ status }) {
  const color = C.status[String(status).toLowerCase()] || C.status.inactive;
  return (
    <View style={[S.badge, { backgroundColor: `${color}1F` }]} accessibilityLabel={`Status ${status}`}>
      <View style={[S.badgeDot, { backgroundColor: color }]} />
      <Text style={[S.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

function ProgressBar({ step }) {
  const w = useRef(new Animated.Value(step / TOTAL_STEPS)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: step / TOTAL_STEPS, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [step, w]);
  return (
    <View
      style={S.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: TOTAL_STEPS, now: step }}
    >
      <Animated.View style={[S.progressFill, { width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
    </View>
  );
}

function StepTransition({ step, dir, children }) {
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(0)).current;
  const o = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    x.setValue(reduced ? 0 : dir * 56);
    o.setValue(0);
    Animated.parallel([
      Animated.timing(o, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(x, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={[S.flex, { opacity: o, transform: [{ translateX: x }] }]}>{children}</Animated.View>;
}

function StepHeader({ title, subtitle }) {
  const ref = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const h = findNodeHandle(ref.current);
        if (h) AccessibilityInfo.setAccessibilityFocus(h);
      } catch (e) {
        /* ignore */
      }
    }, 350);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ marginBottom: SP.xxl }}>
      <Text ref={ref} accessibilityRole="header" style={S.h1}>
        {title}
      </Text>
      {subtitle ? <Text style={S.sub}>{subtitle}</Text> : null}
    </View>
  );
}

function Needed({ errors }) {
  const list = Object.values(errors);
  if (!list.length) return null;
  return (
    <View style={S.needed} accessibilityLiveRegion="polite">
      <Icon name="information-outline" size={16} color={C.textMuted} />
      <Text style={S.neededText}>{list.join('  •  ')}</Text>
    </View>
  );
}

/* ===========================================================================
 * 7. WIZARD STEPS
 * ========================================================================= */
const TYPES = [
  { label: 'Car', icon: 'car' },
  { label: 'Van', icon: 'van-utility' },
  { label: 'SUV', icon: 'car-estate' },
  { label: 'Other', icon: 'dots-horizontal-circle-outline' },
];

function Step1Type({ form, set, errors }) {
  return (
    <>
      <StepHeader title="What are you adding?" subtitle="Pick the type that fits your vehicle best." />
      <View style={S.grid}>
        {TYPES.map((t) => (
          <View key={t.label} style={S.gridCell}>
            <OptionCard label={t.label} icon={t.icon} selected={form.type === t.label} onPress={() => set({ type: t.label })} />
          </View>
        ))}
      </View>
      <Needed errors={errors} />
    </>
  );
}

function Step2Details({ form, set, errors }) {
  const makeSuggestions = useMemo(() => {
    const q = form.make.trim().toLowerCase();
    return Object.keys(MAKES)
      .filter((m) => (q ? m.toLowerCase().includes(q) : true) && m.toLowerCase() !== q)
      .slice(0, 8);
  }, [form.make]);
  const knownMake = Object.keys(MAKES).find((m) => m.toLowerCase() === form.make.trim().toLowerCase());
  const modelSuggestions = knownMake
    ? MAKES[knownMake].filter((m) => m.toLowerCase() !== form.model.trim().toLowerCase())
    : [];
  const years = useMemo(() => {
    const a = [];
    for (let y = CURRENT_YEAR; y >= MIN_YEAR; y -= 1) a.push(y);
    return a;
  }, []);

  return (
    <>
      <StepHeader title="Tell us about it" subtitle="Make, model, colour and year." />
      <Card>
        <Field label="Make" value={form.make} onChangeText={(t) => set({ make: t })} placeholder="e.g. Toyota" error={errors.make} />
        {makeSuggestions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.chipScroll} keyboardShouldPersistTaps="handled">
            {makeSuggestions.map((m) => (
              <Chip key={m} label={m} onPress={() => set({ make: m, model: '' })} small />
            ))}
          </ScrollView>
        )}
        <Field label="Model" value={form.model} onChangeText={(t) => set({ model: t })} placeholder="e.g. Axio" error={errors.model} />
        {modelSuggestions.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.chipScroll} keyboardShouldPersistTaps="handled">
            {modelSuggestions.map((m) => (
              <Chip key={m} label={m} onPress={() => set({ model: m })} small />
            ))}
          </ScrollView>
        )}
      </Card>

      <Card style={{ marginTop: SP.lg }}>
        <Text style={S.label}>Colour</Text>
        <SwatchRow value={form.colour} onChange={(c) => set({ colour: c })} />
        {form.colour === 'Other' && (
          <View style={{ marginTop: SP.md }}>
            <Field label="Colour name" value={form.colourOther} onChangeText={(t) => set({ colourOther: t })} placeholder="e.g. Maroon" />
          </View>
        )}
      </Card>

      <Card style={{ marginTop: SP.lg }}>
        <Text style={S.label}>Year</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {years.map((y) => (
            <Chip key={y} label={String(y)} selected={form.year === y} onPress={() => set({ year: y })} />
          ))}
        </ScrollView>
      </Card>
      <Needed errors={errors} />
    </>
  );
}

function PlateIndicator({ state }) {
  if (state === 'checking') return <ActivityIndicator size="small" color={C.primary} />;
  if (state === 'free') return <Icon name="check-circle" size={22} color={C.status.approved} />;
  if (state === 'taken' || state === 'invalid') return <Icon name="close-circle" size={22} color={C.danger} />;
  return null;
}

function Step3PlateComfort({ form, set, errors, plateState, submitError }) {
  const msg =
    plateState === 'free'
      ? 'Plate number is available'
      : plateState === 'checking'
      ? 'Checking...'
      : null;
  return (
    <>
      <StepHeader title="Plate and comfort" subtitle="Riders see these details first." />
      <Card>
        <Field
          label="Plate number"
          value={form.plateNo}
          onChangeText={(t) => set({ plateNo: t.toUpperCase().replace(/\s+/g, '') })}
          placeholder="e.g. ABC1234"
          autoCapitalize="characters"
          maxLength={10}
          error={errors.plateNo || submitError}
          right={<PlateIndicator state={plateState} />}
          a11yHint="Letters and numbers only, no spaces"
        />
        {msg ? <Text style={[S.muted, { marginTop: -SP.sm }]}>{msg}</Text> : null}
        {submitError ? (
          <Text style={S.error} accessibilityLiveRegion="assertive">
            {submitError}
          </Text>
        ) : null}
      </Card>

      <Card style={{ marginTop: SP.lg }}>
        <Text style={S.label}>Passenger seats</Text>
        <SeatStepper value={form.seats} onChange={(n) => set({ seats: n })} />
      </Card>

      <Card style={{ marginTop: SP.lg }}>
        <View style={[S.row, { justifyContent: 'space-between' }]}>
          <View style={S.row}>
            <View style={S.iconTile}>
              <Icon name="snowflake" size={24} color={C.primary} />
            </View>
            <View style={{ marginLeft: SP.md }}>
              <Text style={S.rowTitle}>Air conditioning</Text>
              <Text style={S.muted}>{form.hasAC ? 'Available' : 'Not available'}</Text>
            </View>
          </View>
          <Toggle value={form.hasAC} onChange={(v) => set({ hasAC: v })} label="Air conditioning" />
        </View>
      </Card>

      <Card style={{ marginTop: SP.lg }}>
        <Text style={S.label}>Luggage space</Text>
        <Segmented options={['Available', 'Limited', 'Unavailable']} value={form.luggage} onChange={(v) => set({ luggage: v })} />
      </Card>
    </>
  );
}

function UploadCard({ title, doc, needsExpiry, error, onPick, onRemove, onExpiry, icon }) {
  const [showPicker, setShowPicker] = useState(false);
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  }, []);
  const expiryDate = doc && doc.expiry ? new Date(`${doc.expiry}T00:00:00`) : tomorrow;
  const done = doc && doc.fileKey && !doc.uploading;

  const onDate = (event, date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed' || !date) return;
    onExpiry(toISO(date));
  };

  return (
    <Card style={{ marginBottom: SP.lg }}>
      <View style={[S.row, { justifyContent: 'space-between' }]}>
        <View style={S.row}>
          <View style={S.iconTile}>
            <Icon name={icon} size={22} color={C.primary} />
          </View>
          <Text style={[S.rowTitle, { marginLeft: SP.md }]}>{title}</Text>
        </View>
        {done ? <PopCheck /> : null}
      </View>

      {!doc ? (
        <Pressable onPress={onPick} accessibilityRole="button" accessibilityLabel={`Upload ${title}`} style={S.dropZone}>
          <Icon name="cloud-upload-outline" size={28} color={C.primary} />
          <Text style={S.dropText}>Tap to upload PDF or image</Text>
        </Pressable>
      ) : (
        <View style={S.fileBox}>
          <View style={[S.row, { justifyContent: 'space-between' }]}>
            <View style={{ flex: 1, paddingRight: SP.md }}>
              <Text style={S.fileName} numberOfLines={1}>
                {doc.name}
              </Text>
              <Text style={S.muted}>{doc.uploading ? `Uploading ${doc.progress || 0}%` : fmtSize(doc.size) || 'Uploaded'}</Text>
            </View>
            <View style={S.row}>
              <Pressable onPress={onPick} accessibilityRole="button" accessibilityLabel={`Replace ${title}`} style={S.miniBtn}>
                <Icon name="swap-horizontal" size={18} color={C.primary} />
              </Pressable>
              <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${title}`} style={[S.miniBtn, { marginLeft: SP.sm }]}>
                <Icon name="trash-can-outline" size={18} color={C.danger} />
              </Pressable>
            </View>
          </View>
          {doc.uploading ? (
            <View style={[S.progressTrack, { marginTop: SP.md }]}>
              <View style={[S.progressFill, { width: `${doc.progress || 0}%` }]} />
            </View>
          ) : null}
        </View>
      )}

      {needsExpiry && doc ? (
        <View style={{ marginTop: SP.lg }}>
          <Text style={S.label}>Expiry date</Text>
          <Pressable
            onPress={() => setShowPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Pick expiry date for ${title}`}
            style={S.input}
          >
            <Text style={[S.inputText, !doc.expiry && { color: C.textMuted }]}>{doc.expiry || 'Select date'}</Text>
            <Icon name="calendar-month-outline" size={22} color={C.primary} />
          </Pressable>
          {doc.expiry && daysUntil(doc.expiry) <= 0 ? (
            <Text style={S.error} accessibilityLiveRegion="polite">
              Expiry must be a future date
            </Text>
          ) : null}
          {showPicker && (
            <View>
              <DateTimePicker
                value={expiryDate}
                mode="date"
                minimumDate={tomorrow}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDate}
              />
              {Platform.OS === 'ios' && (
                <Pressable onPress={() => setShowPicker(false)} style={S.linkBtn} accessibilityRole="button" accessibilityLabel="Done">
                  <Text style={S.link}>Done</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      ) : null}
      {error && !doc ? null : null}
    </Card>
  );
}

function Step4Documents({ form, dispatch, errors }) {
  const pick = async (key) => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets || !res.assets[0]) return;
      const a = res.assets[0];
      dispatch({
        type: 'doc',
        key,
        patch: { name: a.name, size: a.size, uri: a.uri, progress: 0, fileKey: null, uploading: true },
      });
      const { fileKey } = await api.uploadFile(a.uri, key, (p) => dispatch({ type: 'doc', key, patch: { progress: p } }));
      dispatch({ type: 'doc', key, patch: { fileKey, uploading: false, progress: 100 } });
    } catch (e) {
      dispatch({ type: 'doc', key, patch: { uploading: false, fileKey: null } });
      Alert.alert('Upload failed', 'Could not upload that file. Please try again.');
    }
  };
  const cards = [
    { key: 'registration', title: 'Registration document', icon: 'file-document-outline', exp: false },
    { key: 'revenueLicence', title: 'Revenue licence', icon: 'card-account-details-outline', exp: true },
    { key: 'insurance', title: 'Insurance', icon: 'shield-check-outline', exp: true },
  ];
  return (
    <>
      <StepHeader title="Upload documents" subtitle="Clear, readable copies help approval go faster." />
      {cards.map((c) => (
        <UploadCard
          key={c.key}
          title={c.title}
          icon={c.icon}
          doc={form.docs[c.key]}
          needsExpiry={c.exp}
          onPick={() => pick(c.key)}
          onRemove={() => dispatch({ type: 'doc', key: c.key, patch: null })}
          onExpiry={(iso) => dispatch({ type: 'doc', key: c.key, patch: { expiry: iso } })}
        />
      ))}
      <Needed errors={errors} />
    </>
  );
}

function PhotoSlot({ label, photo, required, onPress, onRemove }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={photo ? `Replace ${label} photo` : `Add ${label} photo`}
      style={S.photoSlot}
    >
      {photo ? (
        <>
          <Image source={{ uri: photo.uri }} style={S.photoImg} />
          {photo.uploading ? (
            <View style={S.photoOverlay}>
              <ActivityIndicator color={C.white} />
              <Text style={S.photoPct}>{photo.progress || 0}%</Text>
            </View>
          ) : (
            <View style={S.photoCheck}>
              <PopCheck size={24} />
            </View>
          )}
          <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${label} photo`} style={S.photoRemove}>
            <Icon name="close" size={16} color={C.white} />
          </Pressable>
        </>
      ) : (
        <View style={S.photoEmpty}>
          <Icon name="camera-plus-outline" size={30} color={C.primary} />
          <Text style={S.photoLabel}>{label}</Text>
          <Text style={S.muted}>{required ? 'Required' : 'Optional'}</Text>
        </View>
      )}
    </Pressable>
  );
}

function Step5Photos({ form, dispatch, errors }) {
  const run = async (slot, uri) => {
    const kind = slot === 'front' || slot === 'side' ? slot : 'extra';
    dispatch({ type: 'photo', key: slot, patch: { uri, progress: 0, fileKey: null, uploading: true } });
    try {
      const { fileKey } = await api.uploadFile(uri, kind, (p) => dispatch({ type: 'photo', key: slot, patch: { progress: p } }));
      dispatch({ type: 'photo', key: slot, patch: { fileKey, uploading: false, progress: 100 } });
    } catch (e) {
      dispatch({ type: 'photo', key: slot, patch: null });
      Alert.alert('Upload failed', 'Could not upload that photo. Please try again.');
    }
  };
  const fromGallery = async (slot) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!res.canceled && res.assets && res.assets[0]) run(slot, res.assets[0].uri);
  };
  const fromCamera = async (slot) => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera permission needed', 'Allow camera access in Settings, or choose from your gallery.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets && res.assets[0]) run(slot, res.assets[0].uri);
  };
  const choose = (slot) =>
    Alert.alert('Add photo', 'Choose a source', [
      { text: 'Camera', onPress: () => fromCamera(slot) },
      { text: 'Gallery', onPress: () => fromGallery(slot) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const remove = (slot) => dispatch({ type: 'photo', key: slot, patch: null });

  const extras = ['e0', 'e1', 'e2', 'e3'];
  return (
    <>
      <StepHeader title="Add photos" subtitle="Front and side views are required." />
      <View style={S.photoRow}>
        <PhotoSlot label="Front" required photo={form.photos.front} onPress={() => choose('front')} onRemove={() => remove('front')} />
        <PhotoSlot label="Side" required photo={form.photos.side} onPress={() => choose('side')} onRemove={() => remove('side')} />
      </View>
      <Text style={[S.label, { marginTop: SP.xl }]}>More photos (optional)</Text>
      <View style={S.photoGrid}>
        {extras.map((k, i) => (
          <PhotoSlot key={k} label={`Extra ${i + 1}`} photo={form.photos[k]} onPress={() => choose(k)} onRemove={() => remove(k)} />
        ))}
      </View>
      <Needed errors={errors} />
    </>
  );
}

function ReviewSection({ title, icon, onEdit, children }) {
  return (
    <Card style={{ marginBottom: SP.lg }}>
      <View style={[S.row, { justifyContent: 'space-between', marginBottom: SP.md }]}>
        <View style={S.row}>
          <Icon name={icon} size={20} color={C.primary} />
          <Text style={[S.rowTitle, { marginLeft: SP.sm }]}>{title}</Text>
        </View>
        <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Edit ${title}`} style={S.linkBtn}>
          <Text style={S.link}>Edit</Text>
        </Pressable>
      </View>
      {children}
    </Card>
  );
}

const KV = ({ k, v }) => (
  <View style={S.kv}>
    <Text style={S.muted}>{k}</Text>
    <Text style={S.kvValue}>{v}</Text>
  </View>
);

function Step6Review({ form, goEdit, submitError }) {
  const colour = form.colour === 'Other' ? form.colourOther : form.colour;
  const photos = Object.values(form.photos).filter((p) => p && p.fileKey);
  return (
    <>
      <StepHeader title="Review and submit" subtitle="Check everything before sending it for approval." />
      <ReviewSection title="Type" icon="car-info" onEdit={() => goEdit(1)}>
        <KV k="Vehicle type" v={form.type} />
      </ReviewSection>
      <ReviewSection title="Details" icon="card-text-outline" onEdit={() => goEdit(2)}>
        <KV k="Make" v={form.make} />
        <KV k="Model" v={form.model} />
        <KV k="Colour" v={colour} />
        <KV k="Year" v={String(form.year)} />
      </ReviewSection>
      <ReviewSection title="Plate and comfort" icon="license" onEdit={() => goEdit(3)}>
        <KV k="Plate" v={form.plateNo} />
        <KV k="Seats" v={String(form.seats)} />
        <KV k="Air conditioning" v={form.hasAC ? 'Yes' : 'No'} />
        <KV k="Luggage" v={form.luggage} />
      </ReviewSection>
      <ReviewSection title="Documents" icon="file-document-multiple-outline" onEdit={() => goEdit(4)}>
        <KV k="Registration" v={form.docs.registration ? form.docs.registration.name : '-'} />
        <KV k="Revenue licence" v={form.docs.revenueLicence ? `${form.docs.revenueLicence.name}\nexpires ${form.docs.revenueLicence.expiry}` : '-'} />
        <KV k="Insurance" v={form.docs.insurance ? `${form.docs.insurance.name}\nexpires ${form.docs.insurance.expiry}` : '-'} />
      </ReviewSection>
      <ReviewSection title="Photos" icon="image-multiple-outline" onEdit={() => goEdit(5)}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {photos.map((p, i) => (
            <Image key={p.fileKey + i} source={{ uri: p.uri }} style={S.reviewThumb} />
          ))}
        </ScrollView>
      </ReviewSection>
      {submitError ? (
        <View style={S.alert} accessibilityLiveRegion="assertive">
          <Icon name="alert-circle-outline" size={20} color={C.danger} />
          <Text style={S.alertText}>{submitError}</Text>
        </View>
      ) : null}
    </>
  );
}

/* ===========================================================================
 * 8. SUCCESS SCREEN (check pop + confetti)
 * ========================================================================= */
const CONFETTI_COLORS = [C.primary, C.accent, C.secondary, '#C4B5FD'];

function Confetti() {
  const { height } = Dimensions.get('window');
  const pieces = useRef(
    Array.from({ length: 26 }, (_, i) => ({
      left: `${Math.random() * 96}%`,
      size: 8 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 500,
      dur: 1800 + Math.random() * 1400,
      y: new Animated.Value(-30),
      r: new Animated.Value(0),
    }))
  ).current;
  useEffect(() => {
    pieces.forEach((p) => {
      Animated.parallel([
        Animated.timing(p.y, { toValue: height * 0.75, duration: p.dur, delay: p.delay, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(p.r, { toValue: 1, duration: p.dur, delay: p.delay, useNativeDriver: true }),
      ]).start();
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            left: p.left,
            width: p.size,
            height: p.size * 0.6,
            borderRadius: 2,
            backgroundColor: p.color,
            transform: [{ translateY: p.y }, { rotate: p.r.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '540deg'] }) }],
            opacity: p.y.interpolate({ inputRange: [-30, height * 0.5, height * 0.75], outputRange: [1, 1, 0] }),
          }}
        />
      ))}
    </View>
  );
}

function SuccessScreen({ onAddAnother, onViewVehicles }) {
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(s, { toValue: 1, useNativeDriver: true, bounciness: 16, speed: 8 }).start();
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      /* ignore */
    }
  }, [s]);
  return (
    <GradientScreen>
      <Confetti />
      <SafeAreaView style={[S.flex, S.center, { padding: SP.xxl }]}>
        <Animated.View style={[S.successCircle, { transform: [{ scale: s }] }]}>
          <Icon name="check" size={64} color={C.white} />
        </Animated.View>
        <Text style={[S.h1, { textAlign: 'center', marginTop: SP.xxl }]} accessibilityRole="header">
          Submitted for review
        </Text>
        <Text style={[S.sub, { textAlign: 'center', marginVertical: SP.md }]}>
          We will check your documents and let you know once your vehicle is approved.
        </Text>
        <StatusBadge status="Pending" />
        <View style={{ width: '100%', maxWidth: MAX_W, marginTop: SP.xxxl }}>
          <PrimaryButton title="View my vehicles" onPress={onViewVehicles} dark />
          <PrimaryButton title="Add another vehicle" onPress={onAddAnother} style={{ marginTop: SP.md, backgroundColor: C.tint }} />
        </View>
      </SafeAreaView>
    </GradientScreen>
  );
}

/* ===========================================================================
 * 9. WIZARD SHELL
 * ========================================================================= */
function Wizard({ ownerId, onCreated, onViewVehicles, onExit }) {
  const [form, dispatch] = useReducer(formReducer, initialForm);
  const set = useCallback((patch) => dispatch({ type: 'patch', patch }), []);
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [editing, setEditing] = useState(false);
  const [plateState, setPlateState] = useState('idle');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);

  // Debounced plate uniqueness check
  useEffect(() => {
    const p = form.plateNo;
    if (!p) {
      setPlateState('idle');
      return undefined;
    }
    if (!PLATE_RE.test(p)) {
      setPlateState('invalid');
      return undefined;
    }
    setPlateState('checking');
    let alive = true;
    const t = setTimeout(async () => {
      const taken = await api.isPlateTaken(p);
      if (alive) setPlateState(taken ? 'taken' : 'free');
    }, 500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [form.plateNo]);

  const errors = useMemo(() => validateStep(step, form, plateState), [step, form, plateState]);
  const valid = Object.keys(errors).length === 0;

  const go = (n, d) => {
    setDir(d);
    setStep(n);
  };
  const next = () => {
    if (!valid) return;
    setSubmitError('');
    if (editing) {
      setEditing(false);
      go(6, 1);
    } else if (step < TOTAL_STEPS) go(step + 1, 1);
  };
  const back = () => {
    setSubmitError('');
    if (editing) {
      setEditing(false);
      go(6, -1);
    } else if (step > 1) go(step - 1, -1);
    else onExit();
  };
  const goEdit = (n) => {
    setEditing(true);
    go(n, -1);
  };

  const submit = async () => {
    for (let s = 1; s <= 5; s += 1) {
      if (Object.keys(validateStep(s, form, s === 3 ? 'free' : plateState)).length) {
        go(s, -1);
        return;
      }
    }
    setSubmitting(true);
    setSubmitError('');
    const payload = {
      type: form.type,
      make: form.make.trim(),
      model: form.model.trim(),
      colour: form.colour === 'Other' ? form.colourOther.trim() : form.colour,
      year: form.year,
      plateNo: form.plateNo,
      seats: form.seats,
      hasAC: form.hasAC,
      luggage: form.luggage,
      documents: {
        registration: { fileKey: form.docs.registration.fileKey },
        revenueLicence: { fileKey: form.docs.revenueLicence.fileKey, expiry: form.docs.revenueLicence.expiry },
        insurance: { fileKey: form.docs.insurance.fileKey, expiry: form.docs.insurance.expiry },
      },
      photoKeys: [form.photos.front.fileKey, form.photos.side.fileKey, ...['e0', 'e1', 'e2', 'e3'].map((k) => form.photos[k]).filter((p) => p && p.fileKey).map((p) => p.fileKey)],
    };
    try {
      const vehicle = await api.createVehicle(payload, ownerId);
      onCreated(vehicle);
      setDone(true);
    } catch (e) {
      if (e.code === 'DUPLICATE_PLATE') {
        setPlateState('taken');
        setSubmitError(e.message);
        go(3, -1);
      } else {
        setSubmitError(e.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    dispatch({ type: 'reset' });
    setStep(1);
    setDir(1);
    setEditing(false);
    setPlateState('idle');
    setSubmitError('');
    setDone(false);
  };

  if (done) return <SuccessScreen onAddAnother={reset} onViewVehicles={onViewVehicles} />;

  const stepProps = { form, set, dispatch, errors, plateState, submitError, goEdit };
  const isReview = step === 6;

  return (
    <GradientScreen>
      <SafeAreaView style={S.flex}>
        <KeyboardAvoidingView style={S.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={S.shell}>
            <View style={S.topBar}>
              <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Go back" style={S.backBtn}>
                <Icon name="arrow-left" size={24} color={C.text} />
              </Pressable>
              <Text style={S.stepCount} accessibilityLiveRegion="polite">
                Step {step} of {TOTAL_STEPS}
              </Text>
              <View style={{ width: 44 }} />
            </View>
            <ProgressBar step={step} />

            <StepTransition step={step} dir={dir}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: SP.xxl, paddingBottom: SP.xxxl }}
              >
                {step === 1 && <Step1Type {...stepProps} />}
                {step === 2 && <Step2Details {...stepProps} />}
                {step === 3 && <Step3PlateComfort {...stepProps} />}
                {step === 4 && <Step4Documents {...stepProps} />}
                {step === 5 && <Step5Photos {...stepProps} />}
                {step === 6 && <Step6Review {...stepProps} />}
              </ScrollView>
            </StepTransition>

            <View style={S.bottomBar}>
              {isReview ? (
                <PrimaryButton title="Submit for review" onPress={submit} loading={submitting} dark icon="send" />
              ) : (
                <PrimaryButton
                  title={editing ? 'Back to review' : 'Next'}
                  onPress={next}
                  disabled={!valid}
                  icon={editing ? 'check' : 'arrow-right'}
                />
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientScreen>
  );
}

/* ===========================================================================
 * 10. MY VEHICLES (list + details)
 * ========================================================================= */
const FILTERS = ['All', 'Pending', 'Approved', 'Rejected', 'Inactive', 'Expired'];

function Skeleton() {
  const o = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return (
    <Animated.View style={[S.card, { opacity: o, marginBottom: SP.lg }]}>
      <View style={[S.skel, { height: 150 }]} />
      <View style={[S.skel, { height: 18, width: '60%', marginTop: SP.md }]} />
      <View style={[S.skel, { height: 14, width: '40%', marginTop: SP.sm }]} />
    </Animated.View>
  );
}

const VehicleCard = memo(function VehicleCard({ v, onPress }) {
  const uri = api.getFileUrl(v.photoKeys[0]);
  return (
    <PressScale onPress={() => onPress(v._id)} label={`${v.make} ${v.model} ${v.year}, status ${v.status}`} style={[S.card, { marginBottom: SP.lg, padding: SP.md }]}>
      <Image source={{ uri }} style={S.cardImg} />
      <View style={{ padding: SP.sm }}>
        <View style={[S.row, { justifyContent: 'space-between', marginTop: SP.xs }]}>
          <View style={{ flex: 1, paddingRight: SP.sm }}>
            <Text style={S.cardTitle} numberOfLines={1}>
              {v.make} {v.model}
            </Text>
            <Text style={S.muted}>
              {v.year} · {v.colour} · {v.type}
            </Text>
          </View>
          <StatusBadge status={v.status} />
        </View>
        <View style={[S.row, { marginTop: SP.md, flexWrap: 'wrap' }]}>
          <View style={S.plate}>
            <Text style={S.plateText}>{v.plateNo}</Text>
          </View>
          <Chip small label={`${v.seats} seats`} icon="seat-passenger" />
          <Chip small label={v.hasAC ? 'AC' : 'No AC'} icon="snowflake" />
          <Chip small label={`Luggage: ${v.luggage}`} icon="bag-suitcase-outline" />
        </View>
      </View>
    </PressScale>
  );
});

function VehiclesScreen({ vehicles, loading, refreshing, onRefresh, onOpen, onAdd, onBack }) {
  const [filter, setFilter] = useState('All');
  const data = useMemo(() => (filter === 'All' ? vehicles : vehicles.filter((v) => v.status === filter)), [vehicles, filter]);
  const renderItem = useCallback(({ item }) => <VehicleCard v={item} onPress={onOpen} />, [onOpen]);

  return (
    <GradientScreen>
      <SafeAreaView style={S.flex}>
        <View style={S.shell}>
          <View style={[S.topBar, { marginBottom: SP.sm }]}>
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back" style={S.backBtn}>
              <Icon name="arrow-left" size={24} color={C.text} />
            </Pressable>
            <Text style={S.h2} accessibilityRole="header">
              My Vehicles
            </Text>
            <View style={{ width: 44 }} />
          </View>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: SP.md }}>
              {FILTERS.map((f) => (
                <Chip key={f} label={f} selected={filter === f} onPress={() => setFilter(f)} />
              ))}
            </ScrollView>
          </View>
          {loading ? (
            <View style={{ paddingTop: SP.sm }}>
              <Skeleton />
              <Skeleton />
            </View>
          ) : (
            <FlatList
              data={data}
              keyExtractor={(i) => i._id}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 110, flexGrow: 1 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
              ListEmptyComponent={
                <View style={[S.center, { flex: 1, paddingVertical: SP.xxxl }]}>
                  <View style={[S.successCircle, { backgroundColor: C.tint, width: 96, height: 96, borderRadius: 48 }]}>
                    <Icon name="car-off" size={44} color={C.primary} />
                  </View>
                  <Text style={[S.h2, { marginTop: SP.xl }]}>{filter === 'All' ? 'No vehicles yet' : `No ${filter.toLowerCase()} vehicles`}</Text>
                  <Text style={[S.sub, { textAlign: 'center', marginTop: SP.sm }]}>
                    {filter === 'All' ? 'Add your first vehicle to start taking rides.' : 'Nothing matches this filter.'}
                  </Text>
                  {filter === 'All' ? <PrimaryButton title="Add your first vehicle" onPress={onAdd} style={{ marginTop: SP.xl, paddingHorizontal: SP.xxl }} /> : null}
                </View>
              }
            />
          )}
        </View>
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add vehicle" style={S.fab}>
          <Icon name="plus" size={30} color={C.white} />
        </Pressable>
      </SafeAreaView>
    </GradientScreen>
  );
}

function VehicleDetailsScreen({ vehicle, onBack }) {
  const width = Math.min(Dimensions.get('window').width, MAX_W);
  const [idx, setIdx] = useState(0);
  if (!vehicle) return null;
  const docs = [
    { key: 'registration', title: 'Registration document', icon: 'file-document-outline' },
    { key: 'revenueLicence', title: 'Revenue licence', icon: 'card-account-details-outline' },
    { key: 'insurance', title: 'Insurance', icon: 'shield-check-outline' },
  ];
  const info = [
    ['Type', vehicle.type],
    ['Colour', vehicle.colour],
    ['Year', String(vehicle.year)],
    ['Seats', String(vehicle.seats)],
    ['Air conditioning', vehicle.hasAC ? 'Yes' : 'No'],
    ['Luggage', vehicle.luggage],
  ];
  return (
    <GradientScreen>
      <SafeAreaView style={S.flex}>
        <View style={[S.shell, { paddingBottom: 0 }]}>
          <View style={S.topBar}>
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Go back" style={S.backBtn}>
              <Icon name="arrow-left" size={24} color={C.text} />
            </Pressable>
            <Text style={S.h2} numberOfLines={1}>
              {vehicle.make} {vehicle.model}
            </Text>
            <View style={{ width: 44 }} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: SP.md, paddingBottom: SP.xxxl }}>
            <View style={{ borderRadius: R.lg, overflow: 'hidden' }}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / (width - SP.xxxl * 0 - 40)))}
              >
                {vehicle.photoKeys.map((k) => (
                  <Image key={k} source={{ uri: api.getFileUrl(k) }} style={{ width: Math.min(width, MAX_W) - 40, height: 220 }} />
                ))}
              </ScrollView>
              <View style={S.dots}>
                {vehicle.photoKeys.map((k, i) => (
                  <View key={k} style={[S.dot, i === idx && { backgroundColor: C.white, width: 18 }]} />
                ))}
              </View>
            </View>

            <View style={[S.row, { justifyContent: 'space-between', marginTop: SP.xl }]}>
              <View style={S.plate}>
                <Text style={S.plateText}>{vehicle.plateNo}</Text>
              </View>
              <StatusBadge status={vehicle.status} />
            </View>

            {vehicle.status === 'Rejected' && vehicle.rejectionReason ? (
              <View style={[S.alert, { marginTop: SP.lg }]} accessibilityRole="alert">
                <Icon name="alert-circle-outline" size={22} color={C.danger} />
                <View style={{ flex: 1, marginLeft: SP.sm }}>
                  <Text style={[S.rowTitle, { color: C.danger }]}>Rejected</Text>
                  <Text style={S.alertText}>{vehicle.rejectionReason}</Text>
                </View>
              </View>
            ) : null}

            <Card style={{ marginTop: SP.lg }}>
              <View style={S.infoGrid}>
                {info.map(([k, v]) => (
                  <View key={k} style={S.infoCell}>
                    <Text style={S.muted}>{k}</Text>
                    <Text style={S.kvValue}>{v}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Text style={[S.h2, { marginTop: SP.xl, marginBottom: SP.md }]}>Documents</Text>
            {docs.map((d) => {
              const doc = vehicle.documents[d.key];
              const ex = expiryInfo(doc && doc.expiry);
              return (
                <Pressable
                  key={d.key}
                  onPress={() => Alert.alert(d.title, `Preview placeholder\n${doc ? doc.fileKey : ''}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.title}. ${doc && doc.expiry ? ex.text : ''}`}
                  style={[S.card, S.row, { justifyContent: 'space-between', marginBottom: SP.md, padding: SP.lg }]}
                >
                  <View style={S.row}>
                    <View style={S.iconTile}>
                      <Icon name={d.icon} size={22} color={C.primary} />
                    </View>
                    <View style={{ marginLeft: SP.md }}>
                      <Text style={S.rowTitle}>{d.title}</Text>
                      {doc && doc.expiry ? <Text style={[S.expiry, { color: ex.color }]}>{ex.text}</Text> : <Text style={S.muted}>On file</Text>}
                    </View>
                  </View>
                  <Icon name="chevron-right" size={22} color={C.textMuted} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </GradientScreen>
  );
}

/* ===========================================================================
 * 11. MODULE ROOT (default export)  -  add | list | details
 * ========================================================================= */
const OWNER_FALLBACK = 'user_001';

export default function AddVehicleModule({ ownerId }) {
  // To use your auth context instead, do:
  //   const { user } = useAuth();   const owner = (user && (user._id || user.id)) || OWNER_FALLBACK;
  const owner = ownerId || OWNER_FALLBACK;
  const router = useRouter();

  const [screen, setScreen] = useState('add'); // 'add' | 'list' | 'details'
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async (isRefresh) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setVehicles(await api.listVehicles());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const onCreated = useCallback((v) => setVehicles((prev) => [v, ...prev.filter((p) => p._id !== v._id)]), []);
  const openDetails = useCallback((id) => {
    setSelectedId(id);
    setScreen('details');
  }, []);
  const exitModule = useCallback(() => {
    if (router.canGoBack && router.canGoBack()) router.back();
    else setScreen('list');
  }, [router]);

  const selected = vehicles.find((v) => v._id === selectedId) || null;

  if (screen === 'list')
    return (
      <VehiclesScreen
        vehicles={vehicles}
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        onOpen={openDetails}
        onAdd={() => setScreen('add')}
        onBack={() => setScreen('add')}
      />
    );
  if (screen === 'details') return <VehicleDetailsScreen vehicle={selected} onBack={() => setScreen('list')} />;

  return <Wizard key="wizard" ownerId={owner} onCreated={onCreated} onViewVehicles={() => setScreen('list')} onExit={exitModule} />;
}

/* ===========================================================================
 * 12. STYLES
 * ========================================================================= */
const S = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  shell: { flex: 1, width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: SP.lg },
  glowA: { position: 'absolute', top: -80, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: C.accent, opacity: 0.28 },
  glowB: { position: 'absolute', bottom: 120, left: -100, width: 220, height: 220, borderRadius: 110, backgroundColor: C.primary, opacity: 0.1 },

  h1: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: '800', color: C.text },
  sub: { fontSize: 15, lineHeight: 22, color: C.textMuted, marginTop: SP.sm },
  label: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: SP.sm },
  muted: { fontSize: 13, color: C.textMuted },
  error: { fontSize: 13, color: C.danger, marginTop: SP.xs, fontWeight: '600' },
  rowTitle: { fontSize: 16, fontWeight: '700', color: C.text },

  card: { backgroundColor: C.white, borderRadius: R.lg, padding: SP.xl, ...SHADOW },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...SHADOW },
  stepCount: { fontSize: 14, fontWeight: '700', color: C.secondary },
  progressTrack: { height: 8, borderRadius: R.pill, backgroundColor: C.border, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: R.pill, backgroundColor: C.primary },
  bottomBar: { paddingTop: SP.md },

  btn: { height: 54, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', minWidth: 44 },
  btnText: { color: C.white, fontSize: 16, fontWeight: '700' },

  chip: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: SP.lg, borderRadius: R.pill, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, marginRight: SP.sm },
  chipSmall: { minHeight: 32, paddingHorizontal: SP.md, marginBottom: SP.xs },
  chipOn: { backgroundColor: C.tint, borderColor: C.primary },
  chipText: { fontSize: 14, color: C.text, fontWeight: '500' },
  chipScroll: { flexGrow: 0, marginTop: -SP.sm, marginBottom: SP.lg },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SP.sm },
  gridCell: { width: '50%', padding: SP.sm },
  optionCard: { backgroundColor: C.white, borderRadius: R.xl, paddingVertical: SP.xxl, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', ...SHADOW },
  optionOn: { backgroundColor: C.tint, borderColor: C.primary },
  optionIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { marginTop: SP.md, fontSize: 17, fontWeight: '700', color: C.text },
  checkPos: { position: 'absolute', top: 12, right: 12 },
  checkBadge: { backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },

  input: { minHeight: 52, borderRadius: R.md, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, paddingHorizontal: SP.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { flex: 1, fontSize: 16, color: C.text, paddingVertical: SP.md },

  swatchWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  swatchItem: { width: '20%', alignItems: 'center', marginBottom: SP.md, minHeight: 64 },
  swatchRing: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatchDot: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  swatchLabel: { fontSize: 11, color: C.textMuted, marginTop: 4 },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  roundBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
  bigNumber: { fontSize: 52, fontWeight: '800', color: C.text, lineHeight: 58 },

  iconTile: { width: 44, height: 44, borderRadius: R.sm, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
  toggleTrack: { width: 64, height: 36, borderRadius: 18, padding: 4, justifyContent: 'center' },
  toggleThumb: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.white },

  segWrap: { flexDirection: 'row', backgroundColor: C.tint, borderRadius: R.pill, padding: 4 },
  seg: { flex: 1, minHeight: 44, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: C.primary },
  segText: { fontSize: 13, fontWeight: '700', color: C.secondary },

  dropZone: { marginTop: SP.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.primary, borderRadius: R.md, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center', paddingVertical: SP.xl, minHeight: 88 },
  dropText: { marginTop: SP.sm, fontSize: 14, color: C.primary, fontWeight: '600' },
  fileBox: { marginTop: SP.lg, backgroundColor: C.background, borderRadius: R.md, padding: SP.md, borderWidth: 1, borderColor: C.border },
  fileName: { fontSize: 15, fontWeight: '600', color: C.text },
  miniBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  linkBtn: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SP.sm },
  link: { color: C.primary, fontWeight: '700', fontSize: 15 },

  photoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  photoSlot: { width: '48%', aspectRatio: 1.1, borderRadius: R.lg, backgroundColor: C.white, overflow: 'hidden', marginBottom: SP.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.border },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoLabel: { marginTop: SP.xs, fontSize: 15, fontWeight: '700', color: C.text },
  photoImg: { width: '100%', height: '100%' },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(36,33,59,0.55)', alignItems: 'center', justifyContent: 'center' },
  photoPct: { color: C.white, fontWeight: '700', marginTop: SP.xs },
  photoCheck: { position: 'absolute', bottom: 8, left: 8 },
  photoRemove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(36,33,59,0.7)', alignItems: 'center', justifyContent: 'center' },
  reviewThumb: { width: 84, height: 64, borderRadius: R.sm, marginRight: SP.sm },

  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: SP.xs + 2 },
  kvValue: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right', maxWidth: '65%' },

  needed: { flexDirection: 'row', alignItems: 'flex-start', marginTop: SP.lg, paddingHorizontal: SP.xs },
  neededText: { flex: 1, marginLeft: SP.sm, fontSize: 13, color: C.textMuted },
  alert: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.dangerSoft, borderRadius: R.md, padding: SP.lg, borderWidth: 1, borderColor: '#FECACA' },
  alertText: { flex: 1, marginLeft: SP.sm, fontSize: 14, color: '#7F1D1D', lineHeight: 20 },

  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SP.md, height: 28, borderRadius: R.pill },
  badgeDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  successCircle: { width: 128, height: 128, borderRadius: 64, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW },

  cardImg: { width: '100%', height: 150, borderRadius: R.md, backgroundColor: C.tint },
  cardTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  plate: { backgroundColor: C.text, borderRadius: R.sm, paddingHorizontal: SP.md, paddingVertical: SP.xs + 2, marginRight: SP.sm, marginBottom: SP.xs },
  plateText: { color: C.white, fontWeight: '800', letterSpacing: 1.5, fontSize: 13 },
  skel: { backgroundColor: C.border, borderRadius: R.sm },
  fab: { position: 'absolute', right: 24, bottom: 28, width: 60, height: 60, borderRadius: 30, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW },

  dots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.55)', marginHorizontal: 3 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoCell: { width: '50%', paddingVertical: SP.sm },
  expiry: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});