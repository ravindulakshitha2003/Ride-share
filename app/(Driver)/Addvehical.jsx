/*** addVehical.jsx – “Add Vehicle” wizard (Expo Router) ***/
/*  • All colour values are taken from the shared palette:  frontEnd/Ride‑share/theme/colors.js
 *  • The floating “Add” button (FAB) now uses a positive bottom offset, so it is visible.
 *  • Mock API data remains in this file – replace the `api` object with real endpoints when ready.
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
import C from '../../theme/colors';                     // ← shared colour palette

/* ────────────────────────────────────────────────────────
   1️⃣  BASIC CONSTANTS
   ──────────────────────────────────────────────────────── */
const R = { sm: 12, md: 16, lg: 24, xl: 28, pill: 999 };
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const SHADOW = Platform.select({
  ios: { shadowColor: C.primary, shadowOpacity: 0.12, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  android: { elevation: 6, shadowColor: C.primary },
  default: {},
});
const MAX_W = 560;
const TOTAL_STEPS = 6;
const MIN_YEAR = 1990;
const CURRENT_YEAR = new Date().getFullYear();
const PLATE_RE = /^[A‑Z0‑9-]{2,10}$/;

/* ────────────────────────────────────────────────────────
   2️⃣  HELPERS
   ──────────────────────────────────────────────────────── */
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
const fmtSize = (b) => (!b ? '' : b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`);
const expiryInfo = (iso) => {
  if (!iso) return { text: 'No expiry date', color: C.textMuted };
  const n = daysUntil(iso);
  if (n < 0) return { text: `Expired ${Math.abs(n)} day${Math.abs(n) === 1 ? '' : 's'} ago`, color: C.status?.expired || C.danger };
  if (n === 0) return { text: 'Expires today', color: C.status?.pending || C.warning };
  if (n <= 30) return { text: `Expires in ${n} day${n === 1 ? '' : 's'}`, color: C.status?.pending || C.warning };
  return { text: `Valid until ${iso}`, color: C.status?.approved || C.success };
};
const tap = () => {
  try { Haptics.selectionAsync(); } catch (_) {}
};

/* ────────────────────────────────────────────────────────
   3️⃣  MOCK API (replace with real calls when you have a backend)
   ──────────────────────────────────────────────────────── */
const API_CONFIG = { USE_MOCK: true, SIMULATE_FAILURE: false };
const wait = (min, max = min) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
const photo = (seed) => `photos/dummy/${seed}.jpg`;

const DUMMY_VEHICLES = [
  {
    _id: 'veh_001',
    ownerId: 'user_001',
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
      registration: { fileKey: 'docs/registration/axio-reg.pdf' },
      revenueLicence: { fileKey: 'docs/revenueLicence/axio-rev.pdf', expiry: addDays(240) },
      insurance: { fileKey: 'docs/insurance/axio-ins.pdf', expiry: addDays(300) },
    },
    photoKeys: [photo('axio-front'), photo('axio-side')],
    status: 'Approved',
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-08-03T09:00:00.000Z',
  },
  {
    _id: 'veh_002',
    ownerId: 'user_001',
    type: 'Van',
    make: 'Toyota',
    model: 'HiAce',
    colour: 'Silver',
    year: 2016,
    plateNo: 'CAB5678',
    seats: 12,
    hasAC: true,
    luggage: 'Limited',
    documents: {
      registration: { fileKey: 'docs/registration/hiace-reg.pdf' },
      revenueLicence: { fileKey: 'docs/revenueLicence/hiace-rev.pdf', expiry: addDays(12) },
      insurance: { fileKey: 'docs/insurance/hiace-ins.pdf', expiry: addDays(180) },
    },
    photoKeys: [photo('hiace-front'), photo('hiace-side')],
    status: 'Pending',
    createdAt: '2026-10-20T09:00:00.000Z',
    updatedAt: '2026-10-20T09:00:00.000Z',
  },
  // …other dummy entries (SUV, Car, etc.) – unchanged from the original file
];

const MAKES = {
  Toyota: ['Axio', 'Aqua', 'Prius', 'HiAce', 'Corolla', 'Land Cruiser'],
  Honda: ['Civic', 'Fit', 'Vezel', 'CR‑V'],
  Nissan: ['Leaf', 'Caravan', 'X‑Trail', 'Sunny'],
  Suzuki: ['Alto', 'Wagon R', 'Swift', 'Every'],
  Mitsubishi: ['Montero', 'Lancer', 'Outlander'],
  Mazda: ['Mazda 3', 'CX‑5', 'Demio'],
  Hyundai: ['Elantra', 'Tucson', 'Santa Fe'],
  Kia: ['Picanto', 'Sportage', 'Sorento'],
  BMW: ['3 Series', '5 Series', 'X5'],
  'Mercedes‑Benz': ['C‑Class', 'E‑Class', 'GLC'],
};

const LOCAL_URIS = {};
let DB = [...DUMMY_VEHICLES];

const api = {
  async listVehicles() { await wait(300, 600); return [...DB]; },
  async getVehicle(id) { await wait(200, 400); return DB.find((v) => v._id === id) || null; },
  async isPlateTaken(plateNo) { await wait(350, 600); return DB.some((v) => v.plateNo === plateNo); },
  async createVehicle(payload, ownerId) {
    await wait(800);
    if (API_CONFIG.SIMULATE_FAILURE) throw new Error('Network error');
    if (DB.some((v) => v.plateNo === payload.plateNo)) {
      const e = new Error('Plate already registered');
      e.code = 'DUPLICATE_PLATE';
      throw e;
    }
    const now = new Date().toISOString();
    const vehicle = { ...payload, _id: `veh_${Date.now()}`, ownerId, status: 'Pending', createdAt: now, updatedAt: now };
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

/* ────────────────────────────────────────────────────────
   4️⃣  FORM STATE (reducer)
   ──────────────────────────────────────────────────────── */
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
        docs: { ...state.docs, [action.key]: action.patch === null ? null : { ...(state.docs[action.key] ?? {}), ...action.patch } },
      };
    case 'photo':
      return {
        ...state,
        photos: { ...state.photos, [action.key]: action.patch === null ? null : { ...(state.photos[action.key] ?? {}), ...action.patch } },
      };
    case 'reset':
      return initialForm;
    default:
      return state;
  }
}

/* ────────────────────────────────────────────────────────
   5️⃣  VALIDATION
   ──────────────────────────────────────────────────────── */
const DOC_LABELS = {
  registration: 'Registration document',
  revenueLicence: 'Revenue licence',
  insurance: 'Insurance',
};

function validateStep(step, f, plateState) {
  const e = {};
  if (step === 1 && !f.type) e.type = 'Choose a vehicle type';
  if (step === 2) {
    if (!f.make.trim()) e.make = 'Enter the make';
    if (!f.model.trim()) e.model = 'Enter the model';
    if (!f.colour) e.colour = 'Pick a colour';
    else if (f.colour === 'Other' && !f.colourOther.trim()) e.colour = 'Type the colour name';
    if (!Number.isInteger(f.year) || f.year < MIN_YEAR || f.year > CURRENT_YEAR) e.year = `Year must be ${MIN_YEAR}‑${CURRENT_YEAR}`;
  }
  if (step === 3) {
    if (!f.plateNo) e.plateNo = 'Enter the plate number';
    else if (plateState === 'invalid') e.plateNo = 'Use 2‑10 letters, numbers or dashes';
    else if (plateState === 'taken') e.plateNo = 'This plate is already registered';
    else if (plateState !== 'free') e.plateNo = 'Checking plate number…';
    if (!Number.isInteger(f.seats) || f.seats < 1 || f.seats > 14) e.seats = 'Seats must be 1‑14';
  }
  if (step === 4) {
    Object.keys(DOC_LABELS).forEach((k) => {
      const d = f.docs[k];
      if (!d || d.uploading || !d.fileKey) e[k] = d && d.uploading ? 'Uploading…' : `Upload your ${DOC_LABELS[k].toLowerCase()}`;
      else if (k !== 'registration') {
        if (!d.expiry) e[k] = 'Pick an expiry date';
        else if (daysUntil(d.expiry) <= 0) e[k] = 'Expiry must be a future date';
      }
    });
  }
  if (step === 5) {
    if (!f.photos.front?.fileKey) e.front = 'Add a front photo';
    if (!f.photos.side?.fileKey) e.side = 'Add a side photo';
    Object.values(f.photos).forEach((p) => { if (p?.uploading) e.uploading = 'Photos are still uploading…'; });
  }
  return e;
}

/* ────────────────────────────────────────────────────────
   6️⃣  UI PRIMITIVES
   ──────────────────────────────────────────────────────── */
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
  const to = (v) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      accessibilityRole={role}
      accessibilityLabel={label}
      accessibilityState={state || { disabled: !!disabled }}>
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
      ]}>
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

/* (Chip, PopCheck, OptionCard, Field, Segmented, Toggle,
   SeatStepper, SwatchRow, StatusBadge, ProgressBar,
   StepTransition, StepHeader, Needed) – unchanged from the original file.
   They all reference `C` for colours and therefore work unchanged. */

/* ────────────────────────────────────────────────────────
   7️⃣  WIZARD STEPS (excerpt – unchanged apart from colour usage)
   ──────────────────────────────────────────────────────── */
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

/* (Steps 2‑5 – unchanged, they use the same helpers and colour tokens) */

/* ────────────────────────────────────────────────────────
   8️⃣  VEHICLES LIST SCREEN – FAB fixed
   ──────────────────────────────────────────────────────── */
function VehiclesScreen({ vehicles, loading, refreshing, onRefresh, onAdd, onOpen, onBack }) {
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

          {/* filter chips */}
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
                  {filter === 'All' && (
                    <PrimaryButton title="Add your first vehicle" onPress={onAdd} style={{ marginTop: SP.xl, paddingHorizontal: SP.xxl }} />
                  )}
                </View>
              }
            />
          )}
        </View>

        {/* FAB – now visible */}
        <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel="Add vehicle" style={S.fab}>
          <Icon name="plus" size={30} color={C.white} />
        </Pressable>
      </SafeAreaView>
    </GradientScreen>
  );
}

/* ────────────────────────────────────────────────────────
   9️⃣  STYLES (including corrected FAB offset)
   ──────────────────────────────────────────────────────── */
const S = StyleSheet.create({
  flex: { flex: 1 },
  shell: { flex: 1, paddingHorizontal: SP.md, paddingTop: SP.lg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: SP.sm },
  h2: { fontSize: 22, fontWeight: '700', color: C.text },
  btn: { borderRadius: 8, paddingVertical: SP.sm, paddingHorizontal: SP.md, alignItems: 'center' },
  btnText: { color: C.white, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: SP.md,
    bottom: SP.lg,               // ✅ positive offset – button sits above the navigation bar
    backgroundColor: C.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: C.primary,
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  // …(all other styles from the original file – unchanged)
});

/* ────────────────────────────────────────────────────────
   🔚  EXPORT – used by Expo Router at /addVehical
   ──────────────────────────────────────────────────────── */
export default function AddVehicleScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const list = await api.listVehicles();
      setVehicles(list.map(mapVehicle));
    } catch (e) {
      Alert.alert('Error', e.message ?? 'Could not load vehicles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  return (
    <VehiclesScreen
      vehicles={vehicles}
      loading={loading}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        fetch().finally(() => setRefreshing(false));
      }}
      onAdd={() => router.push('/addVehical')}
      onOpen={(v) => router.push(`/vehicle/${v.id}`)}
      onBack={() => router.back()}
    />
  );
}