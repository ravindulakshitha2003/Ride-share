/*
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
*/

// Import React hooks: useEffect runs code once when the screen opens, useState stores results
import { useEffect, useState } from 'react';
// Import the status bar component that Expo provides
import { StatusBar } from 'expo-status-bar';
// Import basic React Native building blocks
import { StyleSheet, Text, View } from 'react-native';
// Import secure storage so we can test saving a token
import * as SecureStore from 'expo-secure-store';
// Import your palette from the theme file
import { colors } from './src/theme/colors';
// Import the axios client, the token key and the error helper from client.js
import client, { TOKEN_KEY, getErrorMessage } from './src/api/client';

export default function App() {
  // Holds the list of test result lines shown on screen
  const [results, setResults] = useState(['Running tests...']);

  // Run the tests once when the app opens
  useEffect(() => {
    async function runTests() {
      // Collect result lines here
      const out = [];

      // TEST 1: save a fake token and read it back from secure storage
      try {
        await SecureStore.setItemAsync(TOKEN_KEY, 'test-token-123');
        const saved = await SecureStore.getItemAsync(TOKEN_KEY);
        out.push(saved === 'test-token-123' ? 'PASS: token saved and read' : 'FAIL: token mismatch');
      } catch (e) {
        out.push('FAIL: secure store - ' + e.message);
      }

      // TEST 2: send a request to a public site that echoes back the headers it received
      // (a full URL overrides baseURL, so this works without your backend)
      try {
        const res = await client.get('https://httpbin.org/headers');
        const auth = res.data.headers.Authorization;
        out.push(auth === 'Bearer test-token-123' ? 'PASS: token header attached' : 'FAIL: header was ' + auth);
      } catch (e) {
        out.push('FAIL: request - ' + getErrorMessage(e));
      }

      // TEST 3: call an address that cannot answer, to check the friendly error message
      try {
        await client.get('http://10.255.255.1:9999/test', { timeout: 3000 });
      } catch (e) {
        out.push('PASS: error message = ' + getErrorMessage(e));
      }

      // Remove the fake token so it does not stay on the phone
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      // Show all result lines on screen
      setResults(out);
    }
    runTests();
  }, []);

  return (
    // Screen background uses the lavender from your palette
    <View style={styles.container}>
      {/* Title uses the primary indigo */}
      <Text style={styles.title}>Share-Ride test</Text>

      {/* Row of color swatches, one per palette color */}
      <View style={styles.row}>
        {['primary', 'secondary', 'accent', 'text', 'error', 'border'].map((name) => (
          <View key={name} style={[styles.swatch, { backgroundColor: colors[name] }]} />
        ))}
      </View>

      {/* One text line per test result */}
      {results.map((line, i) => (
        <Text key={i} style={styles.line}>{line}</Text>
      ))}
      <StatusBar style="auto" />
    </View>
  );
}

// Styles for the test screen
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginBottom: 16 },
  row: { flexDirection: 'row', marginBottom: 24 },
  swatch: { width: 40, height: 40, borderRadius: 8, marginRight: 8 },
  line: { color: colors.text, marginBottom: 8 },
});
