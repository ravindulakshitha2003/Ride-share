import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import useAuth from '../../hooks/useAuth';

/* -------------------------------------------------------------------------- */
/*  Dummy data + fake api (no backend yet)                                    */
/*                                                                            */
/*  When the backend is ready, delete this block and add back:                */
/*    import { getMe, uploadProfilePhoto } from '../../api/auth';             */
/*    import { getErrorMessage } from '../../api/client';                     */
/* -------------------------------------------------------------------------- */

const DUMMY_PROFILE = {
  _id: 'user_001',
  fullName: 'Kasun Perera',
  username: 'kasun_p',
  email: 'kasun.perera@example.com',
  mobile: '+94 77 123 4567',
  roles: ['Driver', 'Rider'],
  photoUrl: 'https://i.pravatar.cc/300?img=12',
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getMe() {
  await wait(600);
  return { ...DUMMY_PROFILE };
}

async function uploadProfilePhoto(localUri) {
  await wait(1000);
  return { photoUrl: localUri };
}

async function updateProfile(patch) {
  await wait(800);
  return { ...patch };
}

function getErrorMessage(err) {
  return err?.message || 'Something went wrong. Please try again.';
}

/* -------------------------------------------------------------------------- */
/*  Design tokens (same as the Add Vehicle pages)                             */
/* -------------------------------------------------------------------------- */

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
  dangerBorder: '#FECACA',
};
const R = { sm: 12, md: 16, lg: 24, pill: 999 };
const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
const MAX_W = 560;
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

/* -------------------------------------------------------------------------- */
/*  Small components                                                          */
/* -------------------------------------------------------------------------- */

function GradientScreen({ children }) {
  return (
    <LinearGradient colors={[C.background, C.gradientEnd]} style={styles.flex}>
      <View pointerEvents="none" style={styles.glowA} />
      <View pointerEvents="none" style={styles.glowB} />
      {children}
    </LinearGradient>
  );
}

function PressScale({ onPress, disabled, style, children, label }) {
  const scale = useRef(new Animated.Value(1)).current;

  function animateTo(value) {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => animateTo(0.97)}
      onPressOut={() => animateTo(1)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <View style={styles.iconTile}>
        <Icon name={icon} size={22} color={C.primary} />
      </View>

      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value || '-'}</Text>
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*  Edit profile bottom sheet (slides up from the bottom)                     */
/* -------------------------------------------------------------------------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function toForm(profile) {
  return {
    fullName: profile.fullName || profile.name || '',
    username: profile.username || '',
    email: profile.email || '',
    mobile: profile.mobile || '',
  };
}

function validate(form) {
  const errors = {};

  if (!form.fullName.trim()) {
    errors.fullName = 'Enter your full name.';
  }

  if (!form.username.trim()) {
    errors.username = 'Enter a username.';
  }

  if (!EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (form.mobile.replace(/[^0-9]/g, '').length < 9) {
    errors.mobile = 'Enter a valid mobile number.';
  }

  return errors;
}

function FormField({ label, error, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function EditProfileSheet({ visible, profile, onClose, onSave }) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;

  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState(toForm(profile));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (visible) {
      setForm(toForm(profile));
      setErrors({});
      setSaveError('');
      setMounted(true);
      slide.setValue(height);
      fade.setValue(0);

      Animated.parallel([
        Animated.timing(slide, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: height,
          duration: 220,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function update(patch) {
    setForm((previous) => ({ ...previous, ...patch }));
  }

  async function handleSave() {
    const found = validate(form);
    setErrors(found);
    setSaveError('');

    if (Object.keys(found).length > 0) {
      return;
    }

    setSaving(true);

    try {
      await onSave({
        fullName: form.fullName.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
      });
    } catch (err) {
      setSaveError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (!saving) {
      onClose();
    }
  }

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.sheetRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close edit form"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: height * 0.88, transform: [{ translateY: slide }] },
          ]}
        >
          <View style={styles.sheetHandle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Edit profile</Text>
            <Pressable
              onPress={handleClose}
              style={styles.linkButton}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Text style={styles.link}>Cancel</Text>
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.sheetBody,
              { paddingBottom: insets.bottom + 40 },
            ]}
          >
            <FormField label="Full name" error={errors.fullName}>
              <TextInput
                style={[styles.input, errors.fullName && styles.inputError]}
                value={form.fullName}
                onChangeText={(text) => update({ fullName: text })}
                placeholder="e.g. Kasun Perera"
                placeholderTextColor={C.textMuted}
                autoCapitalize="words"
              />
            </FormField>

            <FormField label="Username" error={errors.username}>
              <TextInput
                style={[styles.input, errors.username && styles.inputError]}
                value={form.username}
                onChangeText={(text) =>
                  update({ username: text.replace(/\s+/g, '') })
                }
                placeholder="e.g. kasun_p"
                placeholderTextColor={C.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormField>

            <FormField label="Email" error={errors.email}>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                value={form.email}
                onChangeText={(text) => update({ email: text })}
                placeholder="name@example.com"
                placeholderTextColor={C.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </FormField>

            <FormField label="Mobile" error={errors.mobile}>
              <TextInput
                style={[styles.input, errors.mobile && styles.inputError]}
                value={form.mobile}
                onChangeText={(text) =>
                  update({ mobile: text.replace(/[^0-9+ ]/g, '') })
                }
                placeholder="+94 77 123 4567"
                placeholderTextColor={C.textMuted}
                keyboardType="phone-pad"
              />
            </FormField>

            {saveError ? (
              <Text style={styles.saveError} accessibilityLiveRegion="polite">
                {saveError}
              </Text>
            ) : null}

            <PressScale
              onPress={handleSave}
              disabled={saving}
              label="Save changes"
              style={[
                styles.button,
                styles.buttonDark,
                saving && styles.buttonDisabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator color={C.white} />
              ) : (
                <Text style={styles.buttonText}>Save changes</Text>
              )}
            </PressScale>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function Profile() {
  const { logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState('');
  const insets = useSafeAreaInsets();

  const avatarPop = useRef(new Animated.Value(1)).current;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const me = await getMe();
      setProfile(me);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleSaveProfile(patch) {
    const updated = await updateProfile(patch);

    setProfile((previous) => ({
      ...previous,
      ...updated,
    }));
    setEditing(false);
    setNotice('Profile updated.');
  }

  function popAvatar() {
    avatarPop.setValue(0.85);
    Animated.spring(avatarPop, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 14,
      speed: 12,
    }).start();
  }

  async function pickPhoto(fromCamera) {
    setPhotoError('');

    try {
      if (fromCamera) {
        const permission =
          await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
          setPhotoError('Camera permission is needed to take a photo.');
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

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      setUploading(true);

      const updated = await uploadProfilePhoto(result.assets[0].uri);

      setProfile((previous) => ({
        ...previous,
        ...updated,
      }));
      popAvatar();
    } catch (err) {
      setPhotoError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  function choosePhotoSource() {
    Alert.alert('Profile photo', 'Use a clear profile photo.', [
      {
        text: 'Take a selfie',
        onPress: () => pickPhoto(true),
      },
      {
        text: 'Choose from gallery',
        onPress: () => pickPhoto(false),
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  }

  function handleLogout() {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  }

  if (loading) {
    return (
      <GradientScreen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </GradientScreen>
    );
  }

  if (error) {
    return (
      <GradientScreen>
        <View style={styles.center}>
          <View style={styles.errorIcon}>
            <Icon name="cloud-alert" size={40} color={C.primary} />
          </View>

          <Text style={styles.errorTitle}>Could not load your profile</Text>
          <Text style={styles.error} accessibilityLiveRegion="polite">
            {error}
          </Text>

          <PressScale
            onPress={loadProfile}
            label="Try again"
            style={[styles.button, styles.buttonDark, styles.buttonInline]}
          >
            <Text style={styles.buttonText}>Try again</Text>
          </PressScale>

          <Pressable
            onPress={handleLogout}
            style={styles.linkButton}
            accessibilityRole="button"
            accessibilityLabel="Log out"
          >
            <Text style={styles.link}>Log out</Text>
          </Pressable>
        </View>
      </GradientScreen>
    );
  }

  const roles = Array.isArray(profile?.roles)
    ? profile.roles
    : profile?.role
      ? [profile.role]
      : [];

  const displayName =
    profile?.fullName || profile?.name || profile?.username || 'My Profile';

  const initial = (
    profile?.fullName ||
    profile?.name ||
    profile?.username ||
    '?'
  )
    .charAt(0)
    .toUpperCase();

  return (
    <GradientScreen>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.container,
            { paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.screenTitle} accessibilityRole="header">
              My profile
            </Text>

            <View style={styles.hero}>
              <Pressable
                onPress={choosePhotoSource}
                disabled={uploading}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
              >
                <Animated.View
                  style={[
                    styles.avatarRing,
                    { transform: [{ scale: avatarPop }] },
                  ]}
                >
                  <View style={styles.avatar}>
                    {profile?.photoUrl ? (
                      <Image
                        source={{ uri: profile.photoUrl }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Text style={styles.avatarText}>{initial}</Text>
                    )}

                    {uploading ? (
                      <View style={styles.avatarOverlay}>
                        <ActivityIndicator color={C.white} />
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cameraBadge}>
                    <Icon name="camera" size={16} color={C.white} />
                  </View>
                </Animated.View>
              </Pressable>

              <Text style={styles.changePhoto}>
                {uploading
                  ? 'Uploading...'
                  : profile?.photoUrl
                    ? 'Change photo'
                    : 'Add photo'}
              </Text>

              {photoError ? (
                <View style={styles.alert} accessibilityLiveRegion="assertive">
                  <Icon name="alert-circle-outline" size={20} color={C.danger} />
                  <Text style={styles.alertText}>{photoError}</Text>
                </View>
              ) : null}

              <Text style={styles.name}>{displayName}</Text>

              {roles.length > 0 ? (
                <View style={styles.roleRow}>
                  {roles.map((role) => (
                    <View key={role} style={styles.roleChip}>
                      <Text style={styles.roleText}>{role}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <PressScale
                onPress={() => {
                  setNotice('');
                  setEditing(true);
                }}
                label="Edit profile"
                style={styles.editButton}
              >
                <Icon name="pencil-outline" size={18} color={C.primary} />
                <Text style={styles.editButtonText}>Edit profile</Text>
              </PressScale>

              {notice ? (
                <Text style={styles.notice} accessibilityLiveRegion="polite">
                  {notice}
                </Text>
              ) : null}
            </View>

            <View style={styles.card}>
              <InfoRow
                icon="account-outline"
                label="Username"
                value={profile?.username}
              />
              <InfoRow
                icon="email-outline"
                label="Email"
                value={profile?.email}
              />
              <InfoRow
                icon="phone-outline"
                label="Mobile"
                value={profile?.mobile}
              />
              <InfoRow
                icon="shield-account-outline"
                label="Role"
                value={roles.join(', ')}
                last
              />
            </View>

            <PressScale
              onPress={handleLogout}
              label="Log out"
              style={styles.logout}
            >
              <Icon name="logout" size={20} color={C.danger} />
              <Text style={styles.logoutText}>Log out</Text>
            </PressScale>
          </View>
        </ScrollView>

        <EditProfileSheet
          visible={editing}
          profile={profile}
          onClose={() => setEditing(false)}
          onSave={handleSaveProfile}
        />
      </SafeAreaView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  glowA: {
    position: 'absolute',
    top: -80,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: C.accent,
    opacity: 0.28,
  },
  glowB: {
    position: 'absolute',
    bottom: 120,
    left: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.primary,
    opacity: 0.1,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: SP.lg,
    paddingBottom: 40,
  },
  content: {
    width: '100%',
    maxWidth: MAX_W,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SP.xxl,
  },
  screenTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.4,
  },

  hero: {
    alignItems: 'center',
    marginTop: SP.xxl,
    marginBottom: SP.xxl,
  },
  avatarRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW,
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    color: C.white,
    fontSize: 40,
    fontWeight: '800',
  },
  avatarImage: {
    width: 108,
    height: 108,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(36, 33, 59, 0.55)',
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primary,
    borderWidth: 3,
    borderColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhoto: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
    marginTop: SP.md,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: C.text,
    marginTop: SP.lg,
    textAlign: 'center',
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: SP.sm,
  },
  roleChip: {
    backgroundColor: C.tint,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: R.pill,
    paddingHorizontal: SP.md,
    paddingVertical: SP.xs + 1,
    marginHorizontal: SP.xs,
    marginTop: SP.xs,
  },
  roleText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '700',
  },

  card: {
    backgroundColor: C.white,
    borderRadius: R.lg,
    paddingHorizontal: SP.xl,
    ...SHADOW,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SP.lg,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: R.sm,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    marginLeft: SP.md,
  },
  rowLabel: {
    fontSize: 13,
    color: C.textMuted,
  },
  rowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginTop: 2,
  },

  logout: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SP.xxxl,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.danger,
    backgroundColor: C.white,
  },
  logoutText: {
    color: C.danger,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: SP.sm,
  },

  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    backgroundColor: C.dangerSoft,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.dangerBorder,
    padding: SP.lg,
    marginTop: SP.lg,
  },
  alertText: {
    flex: 1,
    marginLeft: SP.sm,
    fontSize: 14,
    lineHeight: 20,
    color: '#7F1D1D',
  },

  errorIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    marginTop: SP.xl,
    textAlign: 'center',
  },
  error: {
    color: C.danger,
    textAlign: 'center',
    marginTop: SP.sm,
    marginBottom: SP.xl,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    height: 54,
    borderRadius: R.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
  },
  buttonDark: {
    backgroundColor: C.text,
  },
  buttonInline: {
    paddingHorizontal: SP.xxxl,
    marginBottom: SP.sm,
  },
  buttonText: {
    color: C.white,
    fontSize: 16,
    fontWeight: '700',
  },
  linkButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SP.lg,
  },
  link: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  editButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SP.lg,
    paddingHorizontal: SP.xl,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.primary,
    backgroundColor: C.tint,
  },
  editButtonText: {
    color: C.primary,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: SP.sm,
  },
  notice: {
    color: C.primary,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: SP.md,
  },

  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(36, 33, 59, 0.45)',
  },
  sheet: {
    backgroundColor: C.background,
    borderTopLeftRadius: R.lg,
    borderTopRightRadius: R.lg,
    paddingTop: SP.sm + 2,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.border,
    marginBottom: SP.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SP.xxl,
    paddingBottom: SP.sm,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
  },
  sheetBody: {
    paddingHorizontal: SP.xxl,
    paddingTop: SP.sm,
  },
  field: {
    marginBottom: SP.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: SP.sm,
  },
  fieldError: {
    color: C.danger,
    fontSize: 13,
    fontWeight: '600',
    marginTop: SP.xs,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: R.md,
    backgroundColor: C.white,
    paddingHorizontal: SP.lg,
    fontSize: 16,
    color: C.text,
  },
  inputError: {
    borderColor: C.danger,
  },
  saveError: {
    color: C.danger,
    textAlign: 'center',
    marginBottom: SP.md,
  },
});