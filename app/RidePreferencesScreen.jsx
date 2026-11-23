
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '../context/RouteContext';
import rideClient, { getRideErrorMessage } from '../api/rideClient';

const THEME = {
  primary: '#5B4BDB',
  secondary: '#312E81',
  background: '#F8F7FF',
  text: '#24213B',
  white: '#FFFFFF',
  muted: '#85819B',
  border: '#E8E5F2',
  lightPrimary: '#EEECFF',
};

const createStop = () => ({
  id: `${Date.now()}-${Math.random()}`,
  location: '',
  reason: '',
  arrivalTime: '',
  durationMinutes: '15',
  description: '',
  flexibleTime: false,
});

const PUBLISH_PATH = '/api/v1/route-matching/publish';
const SEND_TO_BACKEND = true;

const DEFAULT_PREFERENCES = {
  pets: 'ask_first',
  gender: 'any',
  minAge: '',
  maxAge: '',
  smoking: 'not_allowed',
  food: 'allowed',
  music: 'allowed',
  luggage: 'standard',
};

export default function RidePreferencesScreen() {
  const router = useRouter();
  const { routeData, rideDetails, rideOptions, saveRideOptions, clearRoute } = useRoute();

  const [stops, setStops] = useState(() =>
    (rideOptions?.intermediateStops ?? []).map((stop, index) => ({
      ...stop,
      id: stop.id ?? `saved-${index}-${Date.now()}`,
      durationMinutes: String(stop.durationMinutes ?? 15),
    }))
  );
  const [preferences, setPreferences] = useState(() => ({
    ...DEFAULT_PREFERENCES,
    ...(rideOptions?.preferences ?? {}),
    minAge: rideOptions?.preferences?.minAge == null
      ? ''
      : String(rideOptions.preferences.minAge),
    maxAge: rideOptions?.preferences?.maxAge == null
      ? ''
      : String(rideOptions.preferences.maxAge),
  }));
  const [maxWaitingMinutes, setMaxWaitingMinutes] = useState(
    rideOptions?.maxPassengerWaitingMinutes ?? 10
  );
  const [publishing, setPublishing] = useState(false);

  function updatePreference(key, value) {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateStop(id, key, value) {
    setStops((current) =>
      current.map((stop) =>
        stop.id === id ? { ...stop, [key]: value } : stop
      )
    );
  }

  function addStop() {
    setStops((current) => [...current, createStop()]);
  }

  function removeStop(id) {
    setStops((current) =>
      current.filter((stop) => stop.id !== id)
    );
  }

  function buildRideOptions(useDefaults = false) {
    if (useDefaults) {
      return {
        intermediateStops: [],
        preferences: { ...DEFAULT_PREFERENCES, minAge: null, maxAge: null },
        maxPassengerWaitingMinutes: 10,
      };
    }

    const validStops = stops
      .filter((stop) => stop.location.trim())
      .map(({ id, ...stop }) => {
        const duration = Number(stop.durationMinutes);
        return {
          ...stop,
          location: stop.location.trim(),
          reason: stop.reason.trim(),
          description: stop.description.trim(),
          durationMinutes:
            Number.isFinite(duration) && duration > 0 ? duration : 15,
        };
      });

    const minAge = preferences.minAge.trim()
      ? Number(preferences.minAge)
      : null;
    const maxAge = preferences.maxAge.trim()
      ? Number(preferences.maxAge)
      : null;

    if (
      (minAge !== null && (!Number.isFinite(minAge) || minAge < 0)) ||
      (maxAge !== null && (!Number.isFinite(maxAge) || maxAge < 0))
    ) {
      Alert.alert('Invalid age', 'Enter a valid age or leave the field empty.');
      return null;
    }

    if (minAge !== null && maxAge !== null && minAge > maxAge) {
      Alert.alert(
        'Invalid age range',
        'Minimum age cannot be greater than maximum age.'
      );
      return null;
    }

    return {
      intermediateStops: validStops,
      preferences: { ...preferences, minAge, maxAge },
      maxPassengerWaitingMinutes: maxWaitingMinutes,
    };
  }

  async function handlePublish(useDefaults = false) {
    if (publishing) return;

    if (!routeData?.geometry?.coordinates?.length) {
      return Alert.alert('Missing route', 'Please go back and select your route again.');
    }

    if (!rideDetails?.vehicleId && !rideDetails?.vehicle?.id) {
      return Alert.alert('Missing vehicle', 'Please go back and select a vehicle.');
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(rideDetails?.departureDate ?? '') ||
      !/^\d{2}:\d{2}$/.test(rideDetails?.departureTime ?? '')
    ) {
      return Alert.alert('Missing ride details', 'Please go back and check the departure date and time.');
    }

    const availableSeats = Number(rideDetails?.availableSeats);
    const pricePerSeat = Number(rideDetails?.pricePerSeat);

    if (!Number.isInteger(availableSeats) || availableSeats < 1 || availableSeats > 8) {
      return Alert.alert('Invalid seats', 'Please go back and choose between 1 and 8 seats.');
    }

    if (!Number.isFinite(pricePerSeat) || pricePerSeat <= 0) {
      return Alert.alert('Invalid price', 'Please go back and enter a valid price.');
    }

    const options = buildRideOptions(useDefaults);
    if (!options) return;

    const payload = {
      vehicleId: rideDetails.vehicleId ?? rideDetails.vehicle.id,
      origin: routeData.origin,
      destination: routeData.destination,
      geometry: routeData.geometry,
      distanceMeters: routeData.distanceMeters,
      durationSeconds: routeData.durationSeconds,
      departureDate: rideDetails.departureDate,
      departureTime: rideDetails.departureTime,
      availableSeats,
      pricePerSeat,
      intermediateStops: options.intermediateStops,
      ridePreferences: options.preferences,
      maxPassengerWaitingMinutes: options.maxPassengerWaitingMinutes,
    };

    try {
      setPublishing(true);
      saveRideOptions(options);
      console.log('📦 Publishing complete ride payload:', payload);

      if (!SEND_TO_BACKEND) {
        console.log('📦 Payload prepared but not sent to backend.');
        return;
      }

      const response = await rideClient.post(PUBLISH_PATH, payload, {
        timeout: 30000,
      });

      console.log('✅ Ride published:', response.data);

      Alert.alert('Ride published!', 'Your ride is now live.', [
        {
          text: 'OK',
          onPress: () => {
            clearRoute();
            router.replace('/rideDetailsScreen');
          },
        },
      ]);
    } catch (error) {
      console.error('Publish ride error:', error);
      Alert.alert('Could not publish ride', getRideErrorMessage(error));
    } finally {
      setPublishing(false);
    }
  }

  function handleSave() {
    handlePublish(false);
  }

  function handleSkip() {
    handlePublish(true);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={THEME.background}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={THEME.secondary}
          />
        </TouchableOpacity>

        <Text style={styles.title}>Ride preferences</Text>

        <Text style={styles.subtitle}>
          Add stops and let passengers know your ride rules.
          Everything here is optional.
        </Text>

        {/* Intermediate stops */}
        <SectionHeader
          icon="location-outline"
          title="Intermediate stops"
          subtitle="Add places where you plan to stop during the journey"
        />

        {stops.map((stop, index) => (
          <View key={stop.id} style={styles.card}>
            <View style={styles.stopHeader}>
              <View style={styles.stopNumber}>
                <Text style={styles.stopNumberText}>
                  {index + 1}
                </Text>
              </View>

              <Text style={styles.stopTitle}>
                Stop {index + 1}
              </Text>

              <TouchableOpacity
                onPress={() => removeStop(stop.id)}
                style={styles.removeButton}
              >
                <Ionicons
                  name="trash-outline"
                  size={19}
                  color="#D9534F"
                />
              </TouchableOpacity>
            </View>

            <FieldLabel>Location</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder="e.g. Hotel, restaurant, petrol station"
              placeholderTextColor={THEME.muted}
              value={stop.location}
              onChangeText={(value) =>
                updateStop(stop.id, 'location', value)
              }
            />

            <FieldLabel>Reason for stopping</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder="e.g. Breakfast, rest, sightseeing"
              placeholderTextColor={THEME.muted}
              value={stop.reason}
              onChangeText={(value) =>
                updateStop(stop.id, 'reason', value)
              }
            />

            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <FieldLabel>Arrival time</FieldLabel>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 10:30 AM"
                  placeholderTextColor={THEME.muted}
                  value={stop.arrivalTime}
                  onChangeText={(value) =>
                    updateStop(stop.id, 'arrivalTime', value)
                  }
                />
              </View>

              <View style={styles.column}>
                <FieldLabel>Duration (minutes)</FieldLabel>
                <TextInput
                  style={styles.input}
                  placeholder="15"
                  keyboardType="numeric"
                  placeholderTextColor={THEME.muted}
                  value={stop.durationMinutes}
                  onChangeText={(value) =>
                    updateStop(stop.id, 'durationMinutes', value)
                  }
                />
              </View>
            </View>

            <FieldLabel>Description (optional)</FieldLabel>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Add more details about this stop..."
              placeholderTextColor={THEME.muted}
              multiline
              value={stop.description}
              onChangeText={(value) =>
                updateStop(stop.id, 'description', value)
              }
            />

            <View style={styles.switchRow}>
              <View style={styles.switchTextContainer}>
                <Text style={styles.switchTitle}>
                  Flexible arrival time
                </Text>
                <Text style={styles.switchSubtitle}>
                  Allow some variation in the arrival time
                </Text>
              </View>

              <Switch
                value={stop.flexibleTime}
                onValueChange={(value) =>
                  updateStop(stop.id, 'flexibleTime', value)
                }
                trackColor={{
                  false: '#D9D6E5',
                  true: THEME.primary,
                }}
                thumbColor={THEME.white}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={addStop}
        >
          <Ionicons
            name="add-circle-outline"
            size={21}
            color={THEME.primary}
          />
          <Text style={styles.addButtonText}>
            Add intermediate stop
          </Text>
        </TouchableOpacity>

        {/* Ride rules */}
        <SectionHeader
          icon="shield-checkmark-outline"
          title="Ride rules"
          subtitle="Set expectations before passengers request a seat"
        />

        <View style={styles.card}>
          <PreferenceRow
            title="Pets"
            subtitle="Can passengers bring pets?"
          >
            <OptionGroup
              value={preferences.pets}
              onChange={(value) =>
                updatePreference('pets', value)
              }
              options={[
                { label: 'Allowed', value: 'allowed' },
                { label: 'Not allowed', value: 'not_allowed' },
                { label: 'Ask first', value: 'ask_first' },
              ]}
            />
          </PreferenceRow>

          <Divider />

          <PreferenceRow
            title="Passenger gender"
            subtitle="Preferred passenger group"
          >
            <OptionGroup
              value={preferences.gender}
              onChange={(value) =>
                updatePreference('gender', value)
              }
              options={[
                { label: 'Anyone', value: 'any' },
                { label: 'Women only', value: 'women_only' },
                { label: 'Men only', value: 'men_only' },
              ]}
            />
          </PreferenceRow>

          <Divider />

          <PreferenceRow
            title="Passenger age range"
            subtitle="Optional minimum and maximum age"
          >
            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <Text style={styles.smallLabel}>Minimum age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="No minimum"
                  placeholderTextColor={THEME.muted}
                  keyboardType="numeric"
                  value={preferences.minAge}
                  onChangeText={(value) =>
                    updatePreference('minAge', value)
                  }
                />
              </View>

              <View style={styles.column}>
                <Text style={styles.smallLabel}>Maximum age</Text>
                <TextInput
                  style={styles.input}
                  placeholder="No maximum"
                  placeholderTextColor={THEME.muted}
                  keyboardType="numeric"
                  value={preferences.maxAge}
                  onChangeText={(value) =>
                    updatePreference('maxAge', value)
                  }
                />
              </View>
            </View>
          </PreferenceRow>

          <Divider />

          <PreferenceRow
            title="Smoking"
            subtitle="Smoking policy during the ride"
          >
            <OptionGroup
              value={preferences.smoking}
              onChange={(value) =>
                updatePreference('smoking', value)
              }
              options={[
                { label: 'Not allowed', value: 'not_allowed' },
                { label: 'Allowed', value: 'allowed' },
              ]}
            />
          </PreferenceRow>

          <Divider />

          <PreferenceRow
            title="Food and drinks"
            subtitle="Can passengers eat during the ride?"
          >
            <OptionGroup
              value={preferences.food}
              onChange={(value) =>
                updatePreference('food', value)
              }
              options={[
                { label: 'Allowed', value: 'allowed' },
                { label: 'Not allowed', value: 'not_allowed' },
              ]}
            />
          </PreferenceRow>

          <Divider />

          <PreferenceRow
            title="Music"
            subtitle="Music preference during the journey"
          >
            <OptionGroup
              value={preferences.music}
              onChange={(value) =>
                updatePreference('music', value)
              }
              options={[
                { label: 'Music allowed', value: 'allowed' },
                { label: 'Quiet ride', value: 'quiet' },
              ]}
            />
          </PreferenceRow>

          <Divider />

          <PreferenceRow
            title="Luggage"
            subtitle="What luggage can passengers bring?"
          >
            <OptionGroup
              value={preferences.luggage}
              onChange={(value) =>
                updatePreference('luggage', value)
              }
              options={[
                { label: 'Standard', value: 'standard' },
                { label: 'Small only', value: 'small_only' },
                { label: 'Large allowed', value: 'large_allowed' },
              ]}
            />
          </PreferenceRow>
        </View>

        {/* Passenger waiting time */}
        <SectionHeader
          icon="time-outline"
          title="Passenger waiting time"
          subtitle="How long will you wait if a passenger is late?"
        />

        <View style={styles.card}>
          <Text style={styles.waitingTitle}>
            Maximum waiting time
          </Text>

          <Text style={styles.waitingDescription}>
            Choose the maximum time you are willing to wait
            at the pickup location.
          </Text>

          <View style={styles.waitingOptions}>
            {[5, 10, 15, 20, 30].map((minutes) => {
              const selected = maxWaitingMinutes === minutes;

              return (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.waitingOption,
                    selected && styles.waitingOptionSelected,
                  ]}
                  onPress={() => setMaxWaitingMinutes(minutes)}
                >
                  <Text
                    style={[
                      styles.waitingOptionText,
                      selected && styles.waitingOptionTextSelected,
                    ]}
                  >
                    {minutes} min
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottom actions */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={publishing}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>
            {publishing ? 'Publishing ride...' : 'Publish ride'}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={19}
            color={THEME.white}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={publishing}
        >
          <Text style={styles.skipButtonText}>
            Publish without preferences
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ------------------------------------
// Reusable UI components
// ------------------------------------

function SectionHeader({ icon, title, subtitle }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={THEME.primary}
        />
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function FieldLabel({ children }) {
  return <Text style={styles.fieldLabel}>{children}</Text>;
}

function PreferenceRow({ title, subtitle, children }) {
  return (
    <View style={styles.preferenceRow}>
      <Text style={styles.preferenceTitle}>{title}</Text>
      <Text style={styles.preferenceSubtitle}>{subtitle}</Text>
      <View style={styles.preferenceControl}>
        {children}
      </View>
    </View>
  );
}

function OptionGroup({ value, onChange, options }) {
  return (
    <View style={styles.optionGroup}>
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              selected && styles.optionSelected,
            ]}
            onPress={() => onChange(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                selected && styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

// ------------------------------------
// Styles
// ------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: THEME.background,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 45,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: THEME.white,
    borderWidth: 1,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    color: THEME.text,
  },

  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: THEME.muted,
    marginTop: 7,
    marginBottom: 25,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 14,
    gap: 11,
  },

  sectionIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: THEME.lightPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeading: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: THEME.muted,
    marginTop: 4,
    lineHeight: 16,
  },

  card: {
    backgroundColor: THEME.white,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 16,
    marginBottom: 12,
  },

  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },

  stopNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: THEME.lightPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stopNumberText: {
    color: THEME.primary,
    fontWeight: '800',
  },

  stopTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '800',
    color: THEME.text,
  },

  removeButton: {
    padding: 7,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 7,
    marginTop: 12,
  },

  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: THEME.text,
    backgroundColor: '#FCFBFF',
    fontSize: 13,
  },

  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },

  twoColumns: {
    flexDirection: 'row',
    gap: 10,
  },

  column: {
    flex: 1,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },

  switchTextContainer: {
    flex: 1,
  },

  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },

  switchSubtitle: {
    fontSize: 11,
    color: THEME.muted,
    marginTop: 4,
  },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.lightPrimary,
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
  },

  addButtonText: {
    color: THEME.primary,
    fontSize: 13,
    fontWeight: '800',
  },

  preferenceRow: {
    paddingVertical: 13,
  },

  preferenceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.text,
  },

  preferenceSubtitle: {
    fontSize: 11,
    color: THEME.muted,
    marginTop: 4,
  },

  preferenceControl: {
    marginTop: 12,
  },

  optionGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  option: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9,
    backgroundColor: THEME.white,
  },

  optionSelected: {
    backgroundColor: THEME.lightPrimary,
    borderColor: THEME.primary,
  },

  optionText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.muted,
  },

  optionTextSelected: {
    color: THEME.primary,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: THEME.border,
  },

  smallLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.muted,
    marginBottom: 7,
  },

  waitingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.text,
  },

  waitingDescription: {
    fontSize: 12,
    color: THEME.muted,
    lineHeight: 18,
    marginTop: 6,
  },

  waitingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 18,
  },

  waitingOption: {
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  waitingOptionSelected: {
    backgroundColor: THEME.lightPrimary,
    borderColor: THEME.primary,
  },

  waitingOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.muted,
  },

  waitingOptionTextSelected: {
    color: THEME.primary,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: THEME.primary,
    borderRadius: 16,
    paddingVertical: 17,
    marginTop: 24,
  },

  saveButtonText: {
    color: THEME.white,
    fontSize: 15,
    fontWeight: '800',
  },

  skipButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  skipButtonText: {
    color: THEME.muted,
    fontSize: 13,
    fontWeight: '700',
  },
});
