// useState remembers the typed text and whether suggestions are open; useEffect reacts to outside changes
import { useEffect, useState } from 'react';
// React Native building blocks
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Your palette
import { colors } from '../theme/colors';
// The list of cities to suggest
import { CITIES } from '../data/cities';

// A text box that suggests cities as the user types; the screen only gets a value once a city is picked
export default function LocationInput({ label, value, onChange, error, placeholder }) {
  // What is currently typed in the box
  const [text, setText] = useState(value || '');
  // Whether the suggestion list is showing
  const [open, setOpen] = useState(false);

  // When the screen sets a city from outside (for example a popular route), show it in the box
  useEffect(() => {
    // Only follow real values; an empty value just means the user is still typing
    if (value) {
      setText(value);
      setOpen(false);
    }
  }, [value]);

  // Lowercase the typed text so matching ignores capital letters
  const query = text.trim().toLowerCase();
  // Find up to 5 cities that contain the typed text (none when the box is empty)
  const matches = query ? CITIES.filter((c) => c.toLowerCase().includes(query)).slice(0, 5) : [];

  // Runs every time the user types
  function handleChange(t) {
    // Show what was typed
    setText(t);
    // Typing means no city is chosen yet, so clear the value the screen holds
    onChange('');
    // Open the suggestions
    setOpen(true);
  }

  // Runs when the user taps a suggestion
  function pick(city) {
    // Put the city in the box
    setText(city);
    // Tell the screen which city was chosen
    onChange(city);
    // Close the suggestions
    setOpen(false);
  }

  return (
    <View>
      {/* Label above the box */}
      <Text style={styles.label}>{label}</Text>
      <TextInput
        // Red border when there is an error
        style={[styles.input, error && styles.inputError]}
        // Light grey hint text
        placeholderTextColor="#9CA3AF"
        // Hint shown while the box is empty
        placeholder={placeholder}
        // The typed text
        value={text}
        // Update on every keystroke
        onChangeText={handleChange}
        // Open suggestions when the box is tapped
        onFocus={() => setOpen(true)}
        // Capitalise each word, like a place name
        autoCapitalize="words"
        // Do not auto-correct place names
        autoCorrect={false}
      />
      {/* Suggestion list, shown only while open and when something matches */}
      {open && matches.length > 0 ? (
        <View style={styles.list}>
          {matches.map((city) => (
            // One tappable row per matching city
            <TouchableOpacity key={city} style={styles.item} onPress={() => pick(city)}>
              <Text style={styles.itemText}>{city}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {/* Error message, shown only when there is one */}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// Styles for this component
const styles = StyleSheet.create({
  // Small label above the box
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6, marginTop: 12 },
  // White rounded input with a soft border
  input: {
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text,
  },
  // Red border for an error
  inputError: { borderColor: colors.error },
  // The suggestion list under the box
  list: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, marginTop: 4 },
  // One suggestion row
  item: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  // Suggestion text
  itemText: { color: colors.text, fontSize: 16 },
  // Small red message under the box
  fieldError: { color: colors.error, fontSize: 13, marginTop: 4 },
});