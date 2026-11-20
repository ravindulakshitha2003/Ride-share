import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors } from '../theme/colors';

// Six boxes for a verification code. One hidden input receives the typing,
// so pasting a code and the keyboard's "code from email" suggestion both work.
export default function CodeInput({
  value,
  onChange,
  length = 6,
  error = false,
  editable = true,
  autoFocus = true,
}) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <View>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={styles.row}
        accessibilityLabel={`${length}-digit code`}
      >
        {Array.from({ length }, (_, index) => {
          const digit = value[index];
          const active = focused && index === activeIndex;

          return (
            <View
              key={index}
              style={[
                styles.box,
                active && styles.boxActive,
                error && styles.boxError,
              ]}
            >
              <Text style={[styles.digit, !digit && !active && styles.placeholder]}>
                {digit ?? (active ? '|' : '–')}
              </Text>
            </View>
          );
        })}
      </Pressable>

      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        editable={editable}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  box: {
    width: 46,
    height: 54,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.primary },
  boxError: { borderColor: colors.error },
  digit: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  placeholder: { color: '#9CA3AF', fontWeight: 'normal' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
});

