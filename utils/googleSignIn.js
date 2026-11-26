// Native Google sign-in. Needs a development build (does NOT work in Expo Go).
// The module is loaded only when the button is tapped, so Expo Go
// can still open the app and show the login screen.
import { NativeModules, TurboModuleRegistry } from 'react-native';

const GOOGLE_WEB_CLIENT_ID = '863305498169-kf3j402h0l0g6soh30npn3p1in65lh8r.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';

let google = null;
let configured = false;

// True only in a development/production build that includes the native
// Google module. In Expo Go this is false.
function hasNativeGoogle() {
  return (
    TurboModuleRegistry.get?.('RNGoogleSignin') != null ||
    NativeModules.RNGoogleSignin != null
  );
}

function loadGoogle() {
  if (!google) {
    // Check first: loading the package without its native part shows
    // an "Uncaught Error" screen in development, even inside try/catch.
    if (!hasNativeGoogle()) {
      throw new Error(
        'Google sign-in needs a development build. It does not work in Expo Go.'
      );
    }
    google = require('@react-native-google-signin/google-signin');
  }

  if (!configured) {
    google.GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
    });
    configured = true;
  }

  return google;
}

// Opens the Google account picker.
// Returns the ID token, or null if the user closed the picker.
export async function getGoogleIdToken() {
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } =
    loadGoogle();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Always show the account picker instead of reusing the last account.
    await GoogleSignin.signOut().catch(() => {});

    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response)) {
      return null; // cancelled
    }

    const idToken = response.data?.idToken;

    if (!idToken) {
      throw new Error(
        'Google did not return an ID token. Check webClientId in utils/googleSignIn.js.'
      );
    }

    return idToken;
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return null;
      if (error.code === statusCodes.IN_PROGRESS) return null;
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services is not available on this device.');
      }
    }
    throw error;
  }
}

// Called on logout so the next Google sign-in shows the picker again.
export async function googleSignOut() {
  try {
    const { GoogleSignin } = loadGoogle();
    await GoogleSignin.signOut();
  } catch {
    // Expo Go, or not signed in with Google - nothing to do.
  }
}