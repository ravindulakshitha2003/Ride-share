import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import useAuth from '../../hooks/useAuth';

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
};

const SP = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };

function getErrorMessage(error) {
  return error?.response?.data?.message
    || error?.message
    || 'Something went wrong. Please try again.';
}

function formatDate(value) {
  if (!value) return '-';

  // Backend sends YYYY-MM-DD. Avoid timezone-related date shifts.
  const parts = value.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

function formatRole(role) {
  if (!role) return 'Not specified';
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
}

function InfoRow({ icon, label, value, last = false }) {
  return (
    <View style={[styles.infoRow, !last && styles.rowDivider]}>
      <View style={styles.iconTile}>
        <Icon name={icon} size={21} color={C.primary} />
      </View>

      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '-'}</Text>
      </View>
    </View>
  );
}

function GradientScreen({ children }) {
  return (
    <LinearGradient
      colors={[C.background, C.gradientEnd]}
      style={styles.flex}
    >
      <View pointerEvents="none" style={styles.glowA} />
      <View pointerEvents="none" style={styles.glowB} />
      {children}
    </LinearGradient>
  );
}

export default function Profile() {
  const {
    user,
    loading,
    logout,
    refreshUser,
  } = useAuth();

  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const displayName = user?.name || 'My Profile';
  const initial = displayName.charAt(0).toUpperCase();
  const profilePhoto = typeof user?.profilePhotoUrl === 'string'
    ? user.profilePhotoUrl.trim()
    : '';

  useEffect(() => {
    // Reset the fallback whenever the account's photo URL changes.
    setImageFailed(false);
    console.log('PROFILE USER:', user);
    console.log('PROFILE IMAGE URL:', profilePhoto || 'No profile photo URL');
  }, [user, profilePhoto]);

  async function handleRefresh() {
    if (!refreshUser) return;

    setRefreshing(true);
    try {
      await refreshUser();
    } catch (error) {
      Alert.alert('Profile refresh failed', getErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }

  function handleLogout() {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Logout failed', getErrorMessage(error));
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <GradientScreen>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </SafeAreaView>
      </GradientScreen>
    );
  }

  if (!user) {
    return (
      <GradientScreen>
        <SafeAreaView style={styles.center}>
          <View style={styles.emptyIcon}>
            <Icon name="account-alert-outline" size={42} color={C.primary} />
          </View>
          <Text style={styles.emptyTitle}>Profile unavailable</Text>
          <Text style={styles.emptyDescription}>
            We could not find your account information. Please log in again.
          </Text>
          <Pressable style={styles.primaryButton} onPress={handleLogout}>
            <Text style={styles.primaryButtonText}>Go to login</Text>
          </Pressable>
        </SafeAreaView>
      </GradientScreen>
    );
  }

  return (
    <GradientScreen>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.container,
            { paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={C.primary}
              colors={[C.primary]}
            />
          }
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <View>
                <Text style={styles.eyebrow}>ACCOUNT</Text>
                <Text style={styles.screenTitle}>My profile</Text>
              </View>

              <Pressable
                style={styles.refreshButton}
                onPress={handleRefresh}
                disabled={refreshing}
                accessibilityRole="button"
                accessibilityLabel="Refresh profile"
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={C.primary} />
                ) : (
                  <Icon name="refresh" size={22} color={C.primary} />
                )}
              </Pressable>
            </View>

            <View style={styles.hero}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  {profilePhoto && !imageFailed ? (
                    <Image
                      source={{ uri: profilePhoto }}
                      style={styles.avatarImage}
                      resizeMode="cover"
                      onLoad={() => console.log('Profile image loaded successfully')}
                      onError={(error) => {
                        console.log('Profile image failed to load:', error.nativeEvent);
                        setImageFailed(true);
                      }}
                    />
                  ) : (
                    <Text style={styles.avatarText}>{initial}</Text>
                  )}
                </View>
              </View>

              <Text style={styles.name}>{displayName}</Text>
              <Text style={styles.emailSubtitle}>{user.email || '-'}</Text>

              <View style={styles.roleChip}>
                <Icon
                  name="account-check-outline"
                  size={16}
                  color={C.primary}
                />
                <Text style={styles.roleText}>{formatRole(user.role)}</Text>
              </View>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Personal information</Text>
              <Text style={styles.sectionSubtitle}>
                Your account details
              </Text>
            </View>

            <View style={styles.card}>
              <InfoRow
                icon="account-outline"
                label="Full name"
                value={user.name}
              />
              <InfoRow
                icon="email-outline"
                label="Email address"
                value={user.email}
              />
              <InfoRow
                icon="phone-outline"
                label="Mobile number"
                value={user.mobile}
              />
              <InfoRow
                icon="account-switch-outline"
                label="Account role"
                value={formatRole(user.role)}
              />
              <InfoRow
                icon="gender-male-female"
                label="Gender"
                value={user.gender
                  ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1)
                  : '-'}
              />
              <InfoRow
                icon="calendar-month-outline"
                label="Date of birth"
                value={formatDate(user.dateOfBirth)}
                last
              />
            </View>

            <View style={styles.accountNote}>
              <Icon
                name="shield-check-outline"
                size={20}
                color={C.primary}
              />
              <Text style={styles.accountNoteText}>
                Your profile information is loaded securely from your
                Share-Ride account.
              </Text>
            </View>

            <Pressable
              onPress={handleLogout}
              style={({ pressed }) => [
                styles.logoutButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
            >
              <Icon name="logout" size={20} color={C.danger} />
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>
          </View>
        </ScrollView>
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
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SP.xxl,
  },
  loadingText: {
    marginTop: SP.md,
    color: C.textMuted,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: C.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  screenTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    color: C.text,
    marginTop: 3,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  hero: {
    alignItems: 'center',
    marginTop: SP.xxxl,
    marginBottom: SP.xxxl,
    paddingHorizontal: SP.md,
  },
  avatarRing: {
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
    elevation: 5,
    shadowColor: C.primary,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 112,
    height: 112,
  },
  avatarText: {
    color: C.white,
    fontSize: 42,
    fontWeight: '800',
  },
  name: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '800',
    color: C.text,
    marginTop: SP.lg,
    textAlign: 'center',
  },
  emailSubtitle: {
    fontSize: 14,
    color: C.textMuted,
    marginTop: SP.xs,
    textAlign: 'center',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: C.tint,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: SP.lg,
    paddingVertical: SP.sm,
    marginTop: SP.md,
  },
  roleText: {
    color: C.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeader: {
    marginBottom: SP.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
  },
  sectionSubtitle: {
    color: C.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 22,
    paddingHorizontal: SP.xl,
    borderWidth: 1,
    borderColor: C.border,
    elevation: 4,
    shadowColor: C.primary,
    shadowOpacity: 0.08,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
  },
  infoRow: {
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
    borderRadius: 13,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    marginLeft: SP.md,
  },
  infoLabel: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginTop: 4,
  },
  accountNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.tint,
    borderRadius: 14,
    padding: SP.lg,
    marginTop: SP.xl,
  },
  accountNoteText: {
    flex: 1,
    marginLeft: SP.md,
    color: C.secondary,
    fontSize: 13,
    lineHeight: 19,
  },
  logoutButton: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SP.xxl,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: C.white,
  },
  logoutText: {
    color: C.danger,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: SP.sm,
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: C.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: C.text,
    marginTop: SP.xl,
  },
  emptyDescription: {
    color: C.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: SP.sm,
    marginBottom: SP.xl,
  },
  primaryButton: {
    minHeight: 50,
    paddingHorizontal: SP.xxxl,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '800',
  },
});
