import { View ,TextInput ,Text ,StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native";


 export function Chips({ label, options, value, onChange, error }) {
  return (

    <View>
      {/* Label above the options */}
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((o) => (
          <TouchableOpacity
            // Unique key for each option
            key={o.value}
            // Highlight the option that is currently selected
            style={[styles.chip, value === o.value && styles.chipActive]}
            // Tell the screen which option was tapped
            onPress={() => onChange(o.value)}
          >
            {/* Option text, white when selected */}
            <Text style={[styles.chipText, value === o.value && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Error message, shown only when there is one */}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>

  );
}


// Styles for this screen
const styles = StyleSheet.create({
  // Fills the available space with the lavender background
  flex: { flex: 1, backgroundColor: colors.background },
  // Padding around the whole form (extra at the bottom so the footer is not cut off)
  container: { padding: 24, paddingBottom: 48 },
  // Large indigo heading
  title: { fontSize: 28, fontWeight: 'bold', color: colors.secondary },
  // Smaller text under the heading
  subtitle: { fontSize: 15, color: colors.text, marginTop: 4, marginBottom: 16 },
  // Heading for each group of fields
  section: { fontSize: 18, fontWeight: 'bold', color: colors.primary, marginTop: 24, marginBottom: 4 },
  // Small label above each input
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
  // Small red text under a field
  fieldError: { color: colors.error, fontSize: 13, marginTop: 4 },
  // Red message box at the top of the form
  apiError: { color: colors.error, backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginBottom: 8 },
  // Centres the photo picker
  photoWrap: { alignItems: 'center', marginVertical: 12 },
  // Round placeholder/frame for the photo
  photoCircle: {
    width: 104, height: 104, borderRadius: 52, backgroundColor: colors.white, borderWidth: 2,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  // The chosen photo fills the circle
  photoImage: { width: 104, height: 104 },
  // Plus sign shown before a photo is chosen
  photoPlus: { fontSize: 40, color: colors.primary },
  // Label under the circle
  photoLabel: { color: colors.primary, fontWeight: 'bold', marginTop: 8 },
  // Small grey hint
  photoHint: { color: colors.text, opacity: 0.6, fontSize: 12, marginTop: 2 },
  // Wide 4:3 frame for the vehicle photo
  vehiclePhotoBox: {
    width: '100%', aspectRatio: 4 / 3, backgroundColor: colors.white, borderWidth: 1,
    borderColor: colors.border, borderRadius: 10, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  // The chosen vehicle photo fills the frame
  vehiclePhotoImage: { width: '100%', height: '100%' },
  // Prompt shown before a vehicle photo is chosen
  vehiclePhotoPrompt: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  // Row that holds the option buttons and wraps to a new line if needed
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  // One option button
  chip: {
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8,
  },
  // Selected option: filled with the primary color
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  // Option text
  chipText: { color: colors.text },
  // Selected option text
  chipTextActive: { color: colors.white, fontWeight: 'bold' },
  // Row with a title on the left and a switch on the right
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 },
  // Bold text beside a switch
  switchTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  // Small explanation under the switch title
  switchHint: { fontSize: 13, color: colors.text, marginTop: 2, paddingRight: 12 },
  // Big indigo button
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 28 },
  // Faded look while disabled
  buttonDisabled: { opacity: 0.6 },
  // White bold button text
  buttonText: { color: colors.white, fontSize: 16, fontWeight: 'bold' },
  // Puts the footer text and link on one line
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  // Normal footer text
  footerText: { color: colors.text },
  // Bold indigo link
  link: { color: colors.primary, fontWeight: 'bold' },
});