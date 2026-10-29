
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { colors } from '../../theme/colors';
import  useAuth  from '../../hooks/useAuth';
import { getMe, uploadProfilePhoto } from '../../api/auth';
import { getErrorMessage } from '../../api/client';

function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '-'}</Text>
    </View>
  );
}

export default function Profile() {
  const { logout } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>

        <TouchableOpacity style={styles.button} onPress={loadProfile}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.link}>Log out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const roleText = Array.isArray(profile?.roles)
    ? profile.roles.join(', ')
    : profile?.role;

  const initial = (
    profile?.fullName ||
    profile?.name ||
    profile?.username ||
    '?'
  )
    .charAt(0)
    .toUpperCase();

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.container}
    >
      <TouchableOpacity
        onPress={choosePhotoSource}
        disabled={uploading}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
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
              <ActivityIndicator color={colors.white} />
            </View>
          ) : null}
        </View>

        <Text style={styles.changePhoto}>
          {uploading
            ? 'Uploading...'
            : profile?.photoUrl
              ? 'Change photo'
              : 'Add photo'}
        </Text>
      </TouchableOpacity>

      {photoError ? (
        <Text style={styles.photoError}>{photoError}</Text>
      ) : null}

      <Text style={styles.name}>
        {profile?.fullName || profile?.name || profile?.username || 'My Profile'}
      </Text>

      <View style={styles.card}>
        <InfoRow label="Username" value={profile?.username} />
        <InfoRow label="Email" value={profile?.email} />
        <InfoRow label="Mobile" value={profile?.mobile} />
        <InfoRow label="Role" value={roleText} />
      </View>

      <TouchableOpacity
        style={styles.logout}
        onPress={handleLogout}
        accessibilityRole="button"
      >
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    overflow: 'hidden',
  },
  avatarText: {
    color: colors.white,
    fontSize: 36,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 100,
    height: 100,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  changePhoto: {
    color: colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  photoError: {
    color: colors.error,
    textAlign: 'center',
    marginTop: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.secondary,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  row: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.text,
    opacity: 0.6,
  },
  rowValue: {
    fontSize: 16,
    color: colors.text,
    marginTop: 2,
  },
  logout: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 32,
  },
  logoutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginBottom: 16,
  },
  buttonText: {
    color: colors.white,
    fontWeight: 'bold',
  },
  link: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
