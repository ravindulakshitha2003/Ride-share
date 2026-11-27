/**
 * addVehical.jsx
 * ---------------------------------------------------------------------------
 * "Add Vehicle" wizard + success screen.
 * PLACE AT:   app/addVehical.jsx   (Expo Router route: /addVehical)
 * Colours:    imported from ../../theme/colors  (adjust the path if needed)
 *
 * INSTALL (only what is missing):
 *   npx expo install expo-linear-gradient expo-image-picker \
 *     expo-haptics @react-native-community/datetimepicker react-native-safe-area-context \
 *     @expo/vector-icons
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
  Linking,
  findNodeHandle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../theme/colors';
import client from '../../api/client';
import { useNotifications } from '../../context/notificationContext';

/* ===========================================================================
 * 1. THEME TOKENS  (all colours come from theme/colors.js)
 * ========================================================================= */
const C = {
  ...colors,
  status: {
    pending: colors.warning,
    approved: colors.success,
    rejected: colors.error,
    inactive: colors.grey,
    expired: colors.amber,
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

// How far (px) the bottom buttons sit above the system navigation bar.
// Increase this number to lift the buttons higher.
const BOTTOM_LIFT = 70;
const useBottomSpace = () => {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, SP.lg) + BOTTOM_LIFT;
};

/* ===========================================================================
 * 2. HELPERS
 * ========================================================================= */
const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
 * 3. API
 * Uses the existing Axios client. It automatically attaches the SecureStore token.
 * Backend router: /api/vehicles
 * =========================================================================== */
const api = {
  async listVehicles() {
    const response = await client.get('/api/vehicles/me');
    const data = response.data;
    return Array.isArray(data) ? data : (data?.vehicles || data?.data || []);
  },
  async createVehicle(formData) {
    const response = await client.post('/api/vehicles', formData);
    return response.data?.vehicle || response.data?.data || response.data;
  },
};

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

/* ===========================================================================
 * 4. FORM STATE
 * =========================================================================== */
const initialForm = {
  type: '',
  make: '',
  model: '',
  colour: '',
  colourOther: '',
  year: CURRENT_YEAR,
  plateNo: '',
  crNumber: '',
  seats: 4,
  hasAC: true,
  luggage: 'Available',
  revenueLicenceExpiry: '',
  insuranceExpiry: '',
  vehiclePhoto: null,
};

function formReducer(state, action) {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'reset':
      return { ...initialForm };
    default:
      return state;
  }
}

/* ===========================================================================
 * 5. VALIDATION
 * =========================================================================== */
function validateStep(step, f) {
  const e = {};
  if (step === 1 && !f.type) e.type = 'Choose a vehicle type';
  if (step === 2) {
    if (!f.make.trim()) e.make = 'Enter the brand';
    if (!f.model.trim()) e.model = 'Enter the model';
    if (!f.colour) e.colour = 'Pick a colour';
    else if (f.colour === 'Other' && !f.colourOther.trim()) e.colour = 'Type the colour name';
    if (!Number.isInteger(Number(f.year)) || Number(f.year) < MIN_YEAR || Number(f.year) > CURRENT_YEAR) e.year = `Year must be ${MIN_YEAR} to ${CURRENT_YEAR}`;
  }
  if (step === 3) {
    if (!f.plateNo.trim()) e.plateNo = 'Enter the plate number';
    if (!f.crNumber.trim()) e.crNumber = 'Enter the CR number';
    if (!Number.isInteger(Number(f.seats)) || Number(f.seats) < 1 || Number(f.seats) > 14) e.seats = 'Seats must be 1 to 14';
  }
  if (step === 4) {
    if (!f.revenueLicenceExpiry) e.revenueLicenceExpiry = 'Select the revenue licence expiry date';
    if (!f.insuranceExpiry) e.insuranceExpiry = 'Select the insurance expiry date';
  }
  if (step === 5 && !f.vehiclePhoto?.uri) e.vehiclePhoto = 'Add a vehicle photo';
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

// Vehicle paint colours are data (not theme colours), so they keep their own hex values.
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


function Step3PlateComfort({ form, set, errors, submitError }) {
  return (
    <>
      <StepHeader title="Registration and comfort" subtitle="Add the registration details and passenger features." />
      <Card>
        <Field label="Plate number" value={form.plateNo} onChangeText={(t) => set({ plateNo: t.toUpperCase().replace(/\s+/g, '') })} placeholder="e.g. ABC1234" autoCapitalize="characters" maxLength={12} error={errors.plateNo} />
        <Field label="CR number" value={form.crNumber} onChangeText={(t) => set({ crNumber: t.trimStart() })} placeholder="Enter the CR number" autoCapitalize="characters" maxLength={40} error={errors.crNumber} />
        {submitError ? <Text style={S.error}>{submitError}</Text> : null}
      </Card>
      <Card style={{ marginTop: SP.lg }}>
        <Text style={S.label}>Passenger seats</Text>
        <SeatStepper value={Number(form.seats)} onChange={(n) => set({ seats: n })} />
      </Card>
      <Card style={{ marginTop: SP.lg }}>
        <View style={[S.row, { justifyContent: 'space-between' }]}>
          <View style={S.row}>
            <View style={S.iconTile}><Icon name="snowflake" size={24} color={C.primary} /></View>
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
      <Needed errors={errors} />
    </>
  );
}

function ExpiryField({ label, value, onChange, error }) {
  const [showPicker, setShowPicker] = useState(false);
  const initialDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const onDate = (event, date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed' || !date) return;
    onChange(toISO(date));
  };
  return (
    <View style={{ marginBottom: SP.lg }}>
      <Text style={S.label}>{label}</Text>
      <Pressable onPress={() => setShowPicker(true)} style={S.input} accessibilityRole="button">
        <Text style={[S.inputText, !value && { color: C.textMuted }]}>{value || 'Select expiry date'}</Text>
        <Icon name="calendar-month-outline" size={22} color={C.primary} />
      </Pressable>
      {error ? <Text style={S.error}>{error}</Text> : null}
      {showPicker ? <DateTimePicker value={initialDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onDate} /> : null}
      {showPicker && Platform.OS === 'ios' ? <Pressable onPress={() => setShowPicker(false)} style={S.linkBtn}><Text style={S.link}>Done</Text></Pressable> : null}
    </View>
  );
}

function Step4Expiry({ form, set, errors }) {
  return (
    <>
      <StepHeader title="Licence and insurance" subtitle="Enter the expiry dates for your vehicle documents." />
      <Card>
        <ExpiryField label="Revenue licence expiry" value={form.revenueLicenceExpiry} onChange={(value) => set({ revenueLicenceExpiry: value })} error={errors.revenueLicenceExpiry} />
        <ExpiryField label="Insurance expiry" value={form.insuranceExpiry} onChange={(value) => set({ insuranceExpiry: value })} error={errors.insuranceExpiry} />
      </Card>
      <Needed errors={errors} />
    </>
  );
}

function Step5Photos({ form, set, errors }) {
  const choose = () => Alert.alert('Add vehicle photo', 'Choose a source', [
    { text: 'Camera', onPress: async () => {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera permission needed', 'Allow camera access in Settings, or choose from your gallery.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.75 });
      if (!result.canceled && result.assets?.[0]) set({ vehiclePhoto: result.assets[0] });
    } },
    { text: 'Gallery', onPress: async () => {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.75 });
      if (!result.canceled && result.assets?.[0]) set({ vehiclePhoto: result.assets[0] });
    } },
    { text: 'Cancel', style: 'cancel' },
  ]);
  return (
    <>
      <StepHeader title="Add vehicle photo" subtitle="Upload one clear photo of your vehicle." />
      <Card>
        <Pressable onPress={choose} style={S.photoSlot} accessibilityRole="button" accessibilityLabel="Choose vehicle photo">
          {form.vehiclePhoto?.uri ? (
            <Image source={{ uri: form.vehiclePhoto.uri }} style={S.photoImg} />
          ) : (
            <View style={S.photoEmpty}>
              <Icon name="camera-plus-outline" size={34} color={C.primary} />
              <Text style={S.photoLabel}>Vehicle photo</Text>
              <Text style={S.muted}>Tap to take or select a photo</Text>
            </View>
          )}
        </Pressable>
        {form.vehiclePhoto?.uri ? (
          <Pressable onPress={() => set({ vehiclePhoto: null })} style={[S.linkBtn, { alignSelf: 'flex-end' }]}>
            <Text style={[S.link, { color: C.danger }]}>Remove photo</Text>
          </Pressable>
        ) : null}
      </Card>
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
  return (
    <>
      <StepHeader title="Review and submit" subtitle="Check your vehicle details before submitting." />
      <ReviewSection title="Type" icon="car-info" onEdit={() => goEdit(1)}><KV k="Vehicle type" v={form.type} /></ReviewSection>
      <ReviewSection title="Details" icon="card-text-outline" onEdit={() => goEdit(2)}>
        <KV k="Brand" v={form.make} /><KV k="Model" v={form.model} /><KV k="Colour" v={colour} /><KV k="Year" v={String(form.year)} />
      </ReviewSection>
      <ReviewSection title="Registration and comfort" icon="license" onEdit={() => goEdit(3)}>
        <KV k="Plate number" v={form.plateNo} /><KV k="CR number" v={form.crNumber} /><KV k="Passenger seats" v={String(form.seats)} /><KV k="Air conditioning" v={form.hasAC ? 'Yes' : 'No'} /><KV k="Luggage space" v={form.luggage} />
      </ReviewSection>
      <ReviewSection title="Expiry dates" icon="calendar-check-outline" onEdit={() => goEdit(4)}>
        <KV k="Revenue licence" v={form.revenueLicenceExpiry} /><KV k="Insurance" v={form.insuranceExpiry} />
      </ReviewSection>
      <ReviewSection title="Vehicle photo" icon="image-outline" onEdit={() => goEdit(5)}>
        {form.vehiclePhoto?.uri ? <Image source={{ uri: form.vehiclePhoto.uri }} style={S.reviewThumb} /> : <Text style={S.muted}>No photo selected</Text>}
      </ReviewSection>
      {submitError ? <View style={S.alert} accessibilityLiveRegion="assertive"><Icon name="alert-circle-outline" size={20} color={C.danger} /><Text style={S.alertText}>{submitError}</Text></View> : null}
    </>
  );
}

/* ===========================================================================
 * 8. SUCCESS SCREEN
 * ========================================================================= */
const CONFETTI_COLORS = [C.primary, C.accent, C.secondary, C.lightPink];

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
  const bottomSpace = useBottomSpace();
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
      <SafeAreaView edges={['top', 'left', 'right']} style={[S.flex, S.center, { padding: SP.xxl, paddingBottom: bottomSpace }]}>
        <Animated.View style={[S.successCircle, { transform: [{ scale: s }] }]}>
          <Icon name="check" size={64} color={C.white} />
        </Animated.View>
        <Text style={[S.h1, { textAlign: 'center', marginTop: SP.xxl }]} accessibilityRole="header">
          Submitted for review
        </Text>
        <Text style={[S.sub, { textAlign: 'center', marginVertical: SP.md }]}>
          Your vehicle details have been submitted. We will notify you when its status changes.
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
function Wizard({ onCreated, onViewVehicles, onExit }) {
  const { refresh: refreshNotifications } = useNotifications();
  const [form, dispatch] = useReducer(formReducer, initialForm);
  const set = useCallback((patch) => dispatch({ type: 'patch', patch }), []);
  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);
  const bottomSpace = useBottomSpace();

  const errors = useMemo(() => validateStep(step, form), [step, form]);
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
      if (Object.keys(validateStep(s, form)).length) {
        go(s, -1);
        return;
      }
    }
    setSubmitting(true);
    setSubmitError('');
    const formData = new FormData();
    formData.append('vehicleType', form.type);
    formData.append('brand', form.make.trim());
    formData.append('model', form.model.trim());
    formData.append('year', String(form.year));
    formData.append('color', form.colour === 'Other' ? form.colourOther.trim() : form.colour);
    formData.append('plateNumber', form.plateNo.trim().toUpperCase());
    formData.append('crNumber', form.crNumber.trim());
    formData.append('passengerSeats', String(form.seats));
    formData.append('airConditioning', String(form.hasAC));
    formData.append('luggageSpace', form.luggage);
    formData.append('revenueLicenceExpiry', form.revenueLicenceExpiry);
    formData.append('insuranceExpiry', form.insuranceExpiry);
    const photo = form.vehiclePhoto;
    if (photo?.uri) {
      const uriParts = photo.uri.split('/');
      const name = photo.fileName || uriParts[uriParts.length - 1] || `vehicle-${Date.now()}.jpg`;
      formData.append('vehiclePhoto', {
        uri: photo.uri,
        name,
        type: photo.mimeType || 'image/jpeg',
      });
    }
    try {
      const vehicle = await api.createVehicle(formData);
      onCreated(vehicle);
    
      setDone(true);
      refreshNotifications().catch(() => {});
    } catch (e) {
      setSubmitError(e.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    dispatch({ type: 'reset' });
    setStep(1);
    setDir(1);
    setEditing(false);
    setSubmitError('');
    setDone(false);
  };

  if (done) return <SuccessScreen onAddAnother={reset} onViewVehicles={onViewVehicles} />;

  const stepProps = { form, set, dispatch, errors, submitError, goEdit };
  const isReview = step === 6;

  return (
    <GradientScreen>
      <SafeAreaView edges={['top', 'left', 'right']} style={S.flex}>
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
                {step === 4 && <Step4Expiry {...stepProps} />}
                {step === 5 && <Step5Photos {...stepProps} />}
                {step === 6 && <Step6Review {...stepProps} />}
              </ScrollView>
            </StepTransition>

            {/* Lifted above the system navigation bar */}
            <View style={[S.bottomBar, { paddingBottom: bottomSpace }]}>
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
 * 10. ADD VEHICLE PAGE
 * Only the add-vehicle wizard and its success screen live on this route.
 * The success screen opens the separate /vehicle page.
 * ========================================================================= */
export default function AddVehicleModule() {
  const router = useRouter();

  const exitModule = useCallback(() => {
    if (router.canGoBack && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  return (
    <Wizard
      key="wizard"
      onCreated={() => {}}
      onViewVehicles={() => router.push('/Vehicle')}
      onExit={exitModule}
    />
  );
}

/* ===========================================================================
 * 11. STYLES
 * ========================================================================= */
const S = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  shell: { flex: 1, width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: 20 },
  glowA: { position: 'absolute', top: -80, right: -70, width: 240, height: 240, borderRadius: 120, backgroundColor: C.accent, opacity: 0.28 },
  glowB: { position: 'absolute', bottom: 120, left: -100, width: 220, height: 220, borderRadius: 110, backgroundColor: C.primary, opacity: 0.1 },

  h1: { fontSize: 28, lineHeight: 34, fontWeight: '800', color: C.text, letterSpacing: -0.4 },
  h2: { fontSize: 20, fontWeight: '800', color: C.text },
  sub: { fontSize: 15, lineHeight: 22, color: C.textMuted, marginTop: SP.sm },
  label: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: SP.sm },
  muted: { fontSize: 13, color: C.textMuted },
  error: { fontSize: 13, color: C.danger, marginTop: SP.xs, fontWeight: '600' },
  rowTitle: { fontSize: 16, fontWeight: '700', color: C.text },

  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: SP.xl, ...SHADOW },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', ...SHADOW },
  stepCount: { fontSize: 14, fontWeight: '700', color: C.secondary },
  progressTrack: { height: 8, borderRadius: R.pill, backgroundColor: C.borderSubtle, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: R.pill, backgroundColor: C.primary },
  bottomBar: { paddingTop: SP.md },

  btn: { height: 54, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', minWidth: 44 },
  btnText: { color: C.white, fontSize: 16, fontWeight: '700' },

  chip: { flexDirection: 'row', alignItems: 'center', minHeight: 44, paddingHorizontal: SP.lg, borderRadius: R.pill, backgroundColor: C.surface, borderWidth: 1, borderColor: C.borderSubtle, marginRight: SP.sm },
  chipSmall: { minHeight: 32, paddingHorizontal: SP.md, marginBottom: SP.xs },
  chipOn: { backgroundColor: C.tint, borderColor: C.primary },
  chipText: { fontSize: 14, color: C.text, fontWeight: '500' },
  chipScroll: { flexGrow: 0, marginTop: -SP.sm, marginBottom: SP.lg },

  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -SP.sm },
  gridCell: { width: '50%', padding: SP.sm },
  optionCard: { backgroundColor: C.surface, borderRadius: R.xl, paddingVertical: SP.xxl, alignItems: 'center', borderWidth: 2, borderColor: 'transparent', ...SHADOW },
  optionOn: { backgroundColor: C.tint, borderColor: C.primary },
  optionIcon: { width: 68, height: 68, borderRadius: 22, backgroundColor: C.tint, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { marginTop: SP.md, fontSize: 17, fontWeight: '700', color: C.text },
  checkPos: { position: 'absolute', top: 12, right: 12 },
  checkBadge: { backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },

  input: { minHeight: 52, borderRadius: R.md, borderWidth: 1, borderColor: C.borderSubtle, backgroundColor: C.surface, paddingHorizontal: SP.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  fileBox: { marginTop: SP.lg, backgroundColor: C.background, borderRadius: R.md, padding: SP.md, borderWidth: 1, borderColor: C.borderSubtle },
  fileName: { fontSize: 15, fontWeight: '600', color: C.text },
  miniBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.borderSubtle },
  linkBtn: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SP.sm },
  link: { color: C.primary, fontWeight: '700', fontSize: 15 },

  photoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  photoSlot: { width: '48%', aspectRatio: 1.1, borderRadius: R.lg, backgroundColor: C.surface, overflow: 'hidden', marginBottom: SP.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.borderSubtle },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photoLabel: { marginTop: SP.xs, fontSize: 15, fontWeight: '700', color: C.text },
  photoImg: { width: '100%', height: '100%' },
  photoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: `${C.text}8C`, alignItems: 'center', justifyContent: 'center' },
  photoPct: { color: C.white, fontWeight: '700', marginTop: SP.xs },
  photoCheck: { position: 'absolute', bottom: 8, left: 8 },
  photoRemove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: `${C.text}B3`, alignItems: 'center', justifyContent: 'center' },
  reviewThumb: { width: 84, height: 64, borderRadius: R.sm, marginRight: SP.sm },

  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: SP.xs + 2 },
  kvValue: { fontSize: 15, fontWeight: '600', color: C.text, textAlign: 'right', maxWidth: '65%' },

  needed: { flexDirection: 'row', alignItems: 'flex-start', marginTop: SP.lg, paddingHorizontal: SP.xs },
  neededText: { flex: 1, marginLeft: SP.sm, fontSize: 13, color: C.textMuted },
  alert: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.dangerSoft, borderRadius: R.md, padding: SP.lg, borderWidth: 1, borderColor: `${C.error}33` },
  alertText: { flex: 1, marginLeft: SP.sm, fontSize: 14, color: C.error, lineHeight: 20 },

  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SP.md, height: 28, borderRadius: R.pill },
  badgeDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  successCircle: { width: 128, height: 128, borderRadius: 64, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW },

  cardImg: { width: '100%', height: 150, borderRadius: R.md, backgroundColor: C.tint },
  cardTitle: { fontSize: 18, fontWeight: '800', color: C.text },
  plate: { backgroundColor: C.text, borderRadius: R.sm, paddingHorizontal: SP.md, paddingVertical: SP.xs + 2, marginRight: SP.sm, marginBottom: SP.xs },
  plateText: { color: C.white, fontWeight: '800', letterSpacing: 1.5, fontSize: 13 },
  skel: { backgroundColor: C.borderSubtle, borderRadius: R.sm },
  fab: { position: 'absolute', right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', ...SHADOW },

  dots: { position: 'absolute', bottom: 10, alignSelf: 'center', flexDirection: 'row' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: `${C.white}8C`, marginHorizontal: 3 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  infoCell: { width: '50%', paddingVertical: SP.sm },
  expiry: { fontSize: 13, fontWeight: '700', marginTop: 2 },
});