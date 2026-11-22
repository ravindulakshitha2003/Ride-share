import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors } from '../theme/colors';

// The shared look of the forgot-password and verification screens:
// a white card with the share-ride name, a title and a short explanation.
export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.brand}>share-ride</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {children}
        </View>

        {footer}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },
  brand: { fontSize: 26, fontWeight: 'bold', color: colors.secondary },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.secondary,
    marginTop: 28,
  },
  subtitle: {
    fontSize: 15,
    color: colors.text,
    opacity: 0.75,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 8,
  },
});
