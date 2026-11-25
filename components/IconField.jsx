import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';

// A text box with an icon on the left. Password boxes get a show/hide eye.
export default function IconField({
  label,
  icon,
  error,
  secureTextEntry,
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const isPassword = Boolean(secureTextEntry);

  return (
    <View>
      <Text style={styles.label}>{label}</Text>

      <View
        style={[
          styles.row,
          focused && styles.focused,
          error && styles.errorBorder,
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={error ? colors.error : colors.primary}
          style={styles.icon}
        />

        <TextInput
          style={styles.input}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isPassword && hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setHidden((current) => !current)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  focused: { borderColor: colors.primary },
  errorBorder: { borderColor: colors.error },
  icon: { marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  error: { color: colors.error, fontSize: 13, marginTop: 4 },
});
