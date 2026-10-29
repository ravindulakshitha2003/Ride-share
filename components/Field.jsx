

import { View ,TextInput ,Text ,StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export function Field({ label, error, multiline, ...inputProps  }) {
  return (
    <View>
      {/* Label above the box */}
      <Text style={styles.label}>{label}</Text>
      <TextInput
        // Normal box, taller if multiline, red border if there is an error
        style={[styles.input, multiline && styles.multiline, error && styles.inputError]}
        // Light grey hint text
        placeholderTextColor="#9CA3AF"
        // Do not capitalise automatically (screens can override this)
        autoCapitalize="none"
        // Allow several lines when requested
        multiline={multiline}
        // Pass value, onChangeText, placeholder and so on from the screen
        {...inputProps}
      />
      {/* Error message, shown only when there is one */}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}


// Styles for this screen
const styles = StyleSheet.create({

  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  // White rounded input box with a soft border
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text,
  },
  // Taller box for the description
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  // Red border for a field with an error
  inputError: { borderColor: colors.error },
});