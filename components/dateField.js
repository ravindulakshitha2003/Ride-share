// useState remembers whether the picker is open
import { useState } from 'react';
// React Native building blocks
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// The date picker pop-up (included in Expo Go)
import DateTimePicker from '@react-native-community/datetimepicker';
// Your palette
import { colors } from '../theme/colors';
// Helper that turns a Date into friendly text like "Today" or "Tue, 3 Nov"
import { friendlyDate } from '../utils/date';

// A box that shows the chosen date and opens a calendar pop-up when tapped
export default function DateField({ label, value, onChange, minimumDate, error, placeholder = 'Select date' }) {
  // Whether the calendar pop-up is open
  const [show, setShow] = useState(false);

  // Runs when the user picks a date or cancels the pop-up
  function handleChange(event, selected) {
    // On Android the pop-up closes itself, so hide it after any answer
    if (Platform.OS === 'android') setShow(false);
    // Only keep the date if the user pressed OK (not Cancel)
    if (event.type === 'set' && selected) onChange(selected);
  }

  return (
    <View>
      {/* Label above the box */}
      <Text style={styles.label}>{label}</Text>
      {/* Tapping the box opens the calendar */}
      <TouchableOpacity style={[styles.input, error && styles.inputError]} onPress={() => setShow(true)}>
        {/* Show the chosen date, or grey placeholder text when nothing is chosen */}
        <Text style={value ? styles.value : styles.placeholder}>{value ? friendlyDate(value) : placeholder}</Text>
      </TouchableOpacity>
      {/* Error message, shown only when there is one */}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
      {/* The calendar pop-up, created only while open */}
      {show ? (
        <DateTimePicker
          // Start on the chosen date, or the earliest allowed date, or today
          value={value || minimumDate || new Date()}
          // Date only (no time)
          mode="date"
          // Earlier dates cannot be picked
          minimumDate={minimumDate}
          // Handle the answer
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

// Styles for this component
const styles = StyleSheet.create({
  // Small label above the box
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  // White rounded box that looks like the text inputs
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 14,
  },
  // Red border for an error
  inputError: { borderColor: colors.error },
  // Text of a chosen date
  value: { fontSize: 16, color: colors.text },
  // Grey text shown before a date is chosen
  placeholder: { fontSize: 16, color: '#9CA3AF' },
  // Small red message under the box
  fieldError: { color: colors.error, fontSize: 13, marginTop: 4 },
});