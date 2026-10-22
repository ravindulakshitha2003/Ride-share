// Import useState so the screen can remember what the user types
import { useState } from 'react';
// Import the React Native building blocks used on this screen
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
// Import your palette
import { colors } from '../theme/colors';
// Import the auth hook to get the register function
import { useAuth } from '../context/authContext';
// Import the helper that turns API errors into readable messages
import { getErrorMessage } from '../api/client';

// Convert "YYYY-MM-DD" text into a Date, or return null if the text is not a real date
function parseDate(text) {
  // The text must match the pattern 4 digits - 2 digits - 2 digits
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  // Build a date from the text
  const d = new Date(text);
  // Reject impossible dates such as 2025-02-31 (they roll over to another day)
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== text) return null;
  // Give back the valid date
  return d;
}

// A reusable labelled text box with an error message underneath
function Field({ label, error, multiline, ...inputProps }) {
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

// A reusable row of tap-to-select options (like gender or vehicle type)
function Chips({ label, options, value, onChange, error }) {
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

// Options for the tap-to-select rows (values follow the SRS data dictionary)
const GENDERS = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Prefer not to say', value: 'Prefer not to say' },
];
const VEHICLE_TYPES = [
  { label: 'Car', value: 'Car' },
  { label: 'Van', value: 'Van' },
  { label: 'SUV', value: 'SUV' },
  { label: 'Other', value: 'Other' },
];
const LUGGAGE = [
  { label: 'Available', value: 'available' },
  { label: 'Limited', value: 'limited' },
  { label: 'Unavailable', value: 'unavailable' },
];

// Starting values for every box on the form
const EMPTY_FORM = {
  // Account fields
  fullName: '', mobile: '+94', email: '', password: '', confirmPassword: '', gender: '', dateOfBirth: '',
  // The "I want to drive" switch
  wantsToDrive: false,
  // Driver fields
  nicNumber: '', licenceNumber: '', licenceClass: '', licenceExpiry: '', address: '',
  emergencyName: '', emergencyPhone: '+94',
  // Vehicle fields
  vehicleType: '', make: '', model: '', colour: '', year: '', plateNo: '', seats: '',
  hasAC: false, luggage: '', description: '', crNumber: '', revenueLicenceExpiry: '', insuranceExpiry: '',
};

// The Register screen; "navigation" is provided automatically by React Navigation
export default function RegisterScreen({ navigation }) {
  // Get the register function from AuthContext
  const { register } = useAuth();
  // All form values live in one object
  const [form, setForm] = useState(EMPTY_FORM);
  // Validation messages for each field
  const [errors, setErrors] = useState({});
  // Message shown at the top (server error or "fix the fields")
  const [formError, setFormError] = useState('');
  // True while the request is running
  const [submitting, setSubmitting] = useState(false);

  // Returns a function that updates one field, for example onChangeText={set('email')}
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  // Check every visible field and return an object of error messages (empty means valid)
  function validate() {
    // Start with no errors
    const e = {};
    // Shortcut to the trimmed text of a field
    const v = (k) => String(form[k]).trim();

    // ---- Account fields (FR-01) ----
    if (!v('fullName')) e.fullName = 'Full name is required.';
    // Mobile must be +94 followed by 9 digits
    if (!/^\+94\d{9}$/.test(v('mobile'))) e.mobile = 'Use the format +94771234567.';
    if (!v('email')) e.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(v('email'))) e.email = 'Enter a valid email address.';
    // Password needs at least 8 characters
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    // Both password boxes must match
    if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match.';
    if (!form.gender) e.gender = 'Please choose an option.';
    // Date of birth must be a real date and the user must be 18 or over (BR-12)
    const dob = parseDate(v('dateOfBirth'));
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    if (!dob) e.dateOfBirth = 'Use the format YYYY-MM-DD.';
    else if (dob > cutoff) e.dateOfBirth = 'You must be 18 or over.';

    // The driver and vehicle checks run only when "I want to drive" is on
    if (form.wantsToDrive) {
      // ---- Driver fields (FR-09) ----
      // NIC: old format (9 digits + V or X) or new format (12 digits)
      if (!/^(\d{9}[VvXx]|\d{12})$/.test(v('nicNumber'))) e.nicNumber = 'Enter 9 digits + V/X, or 12 digits.';
      if (!v('licenceNumber')) e.licenceNumber = 'Licence number is required.';
      if (!v('licenceClass')) e.licenceClass = 'Licence class is required (for example B).';
      // Licence expiry must be a real date in the future
      const lic = parseDate(v('licenceExpiry'));
      if (!lic) e.licenceExpiry = 'Use the format YYYY-MM-DD.';
      else if (lic <= new Date()) e.licenceExpiry = 'This licence has expired.';
      if (!v('address')) e.address = 'Address is required.';
      if (!v('emergencyName')) e.emergencyName = 'Emergency contact name is required.';
      if (!/^\+94\d{9}$/.test(v('emergencyPhone'))) e.emergencyPhone = 'Use the format +94771234567.';

      // ---- Vehicle fields (FR-12) ----
      if (!form.vehicleType) e.vehicleType = 'Please choose a vehicle type.';
      if (!v('make')) e.make = 'Brand is required (for example Toyota).';
      if (!v('model')) e.model = 'Model is required.';
      if (!v('colour')) e.colour = 'Colour is required.';
      // Year must be a number in a sensible range
      const year = Number(v('year'));
      if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) e.year = 'Enter a valid year.';
      if (!v('plateNo')) e.plateNo = 'Number plate is required.';
      // Passenger seats must be a whole number from 1 to 8
      const seats = Number(v('seats'));
      if (!Number.isInteger(seats) || seats < 1 || seats > 8) e.seats = 'Enter passenger seats (1 to 8).';
      if (!form.luggage) e.luggage = 'Please choose an option.';
      if (!v('crNumber')) e.crNumber = 'Registration (CR) number is required.';
      // Revenue licence expiry is required; insurance expiry is optional
      if (!parseDate(v('revenueLicenceExpiry'))) e.revenueLicenceExpiry = 'Use the format YYYY-MM-DD.';
      if (v('insuranceExpiry') && !parseDate(v('insuranceExpiry'))) e.insuranceExpiry = 'Use the format YYYY-MM-DD.';
    }
    // Give the errors back to the caller
    return e;
  }

  // Runs when the user taps the Create account button
  async function handleRegister() {
    // Clear any old top message
    setFormError('');
    // Check the form first
    const e = validate();
    // Show the field errors
    setErrors(e);
    // Stop if there is any error, and tell the user to look at the red fields
    if (Object.keys(e).length > 0) {
      setFormError('Please fix the highlighted fields.');
      return;
    }

    // Build the data to send (the confirm-password box is not sent)
    const payload = {
      fullName: form.fullName.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth.trim(),
      wantsToDrive: form.wantsToDrive,
    };
    // Add driver and vehicle details only for people who want to drive
    if (form.wantsToDrive) {
      payload.driver = {
        nicNumber: form.nicNumber.trim().toUpperCase(),
        licenceNumber: form.licenceNumber.trim(),
        licenceClass: form.licenceClass.trim().toUpperCase(),
        licenceExpiry: form.licenceExpiry.trim(),
        address: form.address.trim(),
        emergencyContact: { name: form.emergencyName.trim(), phone: form.emergencyPhone.trim() },
      };
      payload.vehicle = {
        type: form.vehicleType,
        make: form.make.trim(),
        model: form.model.trim(),
        colour: form.colour.trim(),
        year: Number(form.year),
        plateNo: form.plateNo.trim().toUpperCase(),
        seats: Number(form.seats),
        hasAC: form.hasAC,
        luggage: form.luggage,
        description: form.description.trim(),
        crNumber: form.crNumber.trim(),
        revenueLicenceExpiry: form.revenueLicenceExpiry.trim(),
        insuranceExpiry: form.insuranceExpiry.trim() || undefined,
      };
    }

    // Start the loading state
    setSubmitting(true);
    try {
      // Send the data to the backend through AuthContext
      await register(payload);
      // Choose the success message
      const msg = form.wantsToDrive
        ? 'Your driver application was submitted for review. You can log in now.'
        : 'You can log in now.';
      // Show it, then go to the Login screen when the user taps OK
      Alert.alert('Account created', msg, [{ text: 'OK', onPress: () => navigation.navigate('Login') }]);
    } catch (err) {
      // Show a readable message from the server or the network
      setFormError(getErrorMessage(err));
    } finally {
      // Stop the loading state whether it worked or failed
      setSubmitting(false);
    }
  }

  return (
    // Moves the form up when the keyboard opens
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Scrollable form; taps still work while the keyboard is open */}
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Screen title and subtitle */}
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join Share-Ride as a passenger or driver</Text>

        {/* Top message box for server errors or "fix the fields" */}
        {formError ? <Text style={styles.apiError}>{formError}</Text> : null}

        {/* ---------- Account section ---------- */}
        <Text style={styles.section}>Your details</Text>
        <Field label="Full name" value={form.fullName} onChangeText={set('fullName')} error={errors.fullName} autoCapitalize="words" placeholder="Nimal Perera" />
        <Field label="Mobile number" value={form.mobile} onChangeText={set('mobile')} error={errors.mobile} keyboardType="phone-pad" placeholder="+94771234567" />
        <Field label="Email" value={form.email} onChangeText={set('email')} error={errors.email} keyboardType="email-address" autoCorrect={false} placeholder="you@example.com" />
        <Field label="Password" value={form.password} onChangeText={set('password')} error={errors.password} secureTextEntry placeholder="At least 8 characters" />
        <Field label="Confirm password" value={form.confirmPassword} onChangeText={set('confirmPassword')} error={errors.confirmPassword} secureTextEntry placeholder="Repeat your password" />
        <Chips label="Gender" options={GENDERS} value={form.gender} onChange={set('gender')} error={errors.gender} />
        <Field label="Date of birth" value={form.dateOfBirth} onChangeText={set('dateOfBirth')} error={errors.dateOfBirth} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD" />

        {/* ---------- "I want to drive" switch (FR-07) ---------- */}
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={styles.switchTitle}>I want to drive</Text>
            <Text style={styles.switchHint}>Add your licence and vehicle now. An admin reviews it before you can publish rides.</Text>
          </View>
          {/* Turning this on reveals the driver and vehicle sections */}
          <Switch value={form.wantsToDrive} onValueChange={set('wantsToDrive')} trackColor={{ true: colors.primary }} />
        </View>

        {/* The sections below appear only when the switch is on */}
        {form.wantsToDrive ? (
          <View>
            {/* ---------- Driver section ---------- */}
            <Text style={styles.section}>Driver details</Text>
            <Field label="NIC number" value={form.nicNumber} onChangeText={set('nicNumber')} error={errors.nicNumber} autoCapitalize="characters" placeholder="199012345678 or 901234567V" />
            <Field label="Driving licence number" value={form.licenceNumber} onChangeText={set('licenceNumber')} error={errors.licenceNumber} autoCapitalize="characters" placeholder="B1234567" />
            <Field label="Licence class" value={form.licenceClass} onChangeText={set('licenceClass')} error={errors.licenceClass} autoCapitalize="characters" placeholder="B" />
            <Field label="Licence expiry date" value={form.licenceExpiry} onChangeText={set('licenceExpiry')} error={errors.licenceExpiry} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD" />
            <Field label="Address" value={form.address} onChangeText={set('address')} error={errors.address} autoCapitalize="words" placeholder="No. 12, Main Street, Matara" />
            <Field label="Emergency contact name" value={form.emergencyName} onChangeText={set('emergencyName')} error={errors.emergencyName} autoCapitalize="words" placeholder="Contact person" />
            <Field label="Emergency contact phone" value={form.emergencyPhone} onChangeText={set('emergencyPhone')} error={errors.emergencyPhone} keyboardType="phone-pad" placeholder="+94771234567" />

            {/* ---------- Vehicle section ---------- */}
            <Text style={styles.section}>Vehicle details</Text>
            <Chips label="Vehicle type" options={VEHICLE_TYPES} value={form.vehicleType} onChange={set('vehicleType')} error={errors.vehicleType} />
            <Field label="Brand" value={form.make} onChangeText={set('make')} error={errors.make} autoCapitalize="words" placeholder="Toyota" />
            <Field label="Model" value={form.model} onChangeText={set('model')} error={errors.model} autoCapitalize="words" placeholder="Prius" />
            <Field label="Colour" value={form.colour} onChangeText={set('colour')} error={errors.colour} autoCapitalize="words" placeholder="White" />
            <Field label="Year" value={form.year} onChangeText={set('year')} error={errors.year} keyboardType="number-pad" placeholder="2018" />
            <Field label="Number plate" value={form.plateNo} onChangeText={set('plateNo')} error={errors.plateNo} autoCapitalize="characters" placeholder="CAB-1234" />
            <Field label="Passenger seats (not counting the driver)" value={form.seats} onChangeText={set('seats')} error={errors.seats} keyboardType="number-pad" placeholder="3" />
            {/* Air conditioning yes/no switch */}
            <View style={styles.switchRow}>
              <Text style={styles.switchTitle}>Air conditioning</Text>
              <Switch value={form.hasAC} onValueChange={set('hasAC')} trackColor={{ true: colors.primary }} />
            </View>
            <Chips label="Luggage space" options={LUGGAGE} value={form.luggage} onChange={set('luggage')} error={errors.luggage} />
            <Field label="Vehicle description (optional)" value={form.description} onChangeText={set('description')} multiline placeholder="Clean, comfortable, non-smoking..." autoCapitalize="sentences" />
            <Field label="Registration (CR) number" value={form.crNumber} onChangeText={set('crNumber')} error={errors.crNumber} autoCapitalize="characters" placeholder="Certificate of registration number" />
            <Field label="Revenue licence expiry" value={form.revenueLicenceExpiry} onChangeText={set('revenueLicenceExpiry')} error={errors.revenueLicenceExpiry} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD" />
            <Field label="Insurance expiry (optional)" value={form.insuranceExpiry} onChangeText={set('insuranceExpiry')} error={errors.insuranceExpiry} keyboardType="numbers-and-punctuation" placeholder="YYYY-MM-DD" />
          </View>
        ) : null}

        {/* Main button; dimmed and disabled while the request runs */}
        <TouchableOpacity style={[styles.button, submitting && styles.buttonDisabled]} onPress={handleRegister} disabled={submitting}>
          {/* Spinner while loading, button text otherwise */}
          {submitting ? <ActivityIndicator color={colors.white} /> : <Text style={styles.buttonText}>Create account</Text>}
        </TouchableOpacity>

        {/* Link back to the Login screen */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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