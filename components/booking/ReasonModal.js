// =============================================================================
// ReasonModal - popup asking for an optional reason (used for Reject).
//
// Why not Alert.prompt? It only works on iOS. A Modal + TextInput works on
// both Android and iOS.
//
// Props:
//   visible, title, confirmLabel, loading
//   onConfirm(reasonText)   onCancel()
// =============================================================================

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// Quick-pick reasons so the driver doesn't have to type.
const QUICK_REASONS = ['Car is full', 'Pickup point too far', 'Route changed'];

export default function ReasonModal({ visible, title, confirmLabel, loading, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');

  // Clear the text every time the modal opens.
  useEffect(() => {
    if (visible) setReason('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* KeyboardAvoidingView pushes the box up when the keyboard opens */}
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Reason (optional) - the passenger will see this.</Text>

          <View style={styles.chips}>
            {QUICK_REASONS.map((text) => (
              <Pressable
                key={text}
                onPress={() => setReason(text)}
                style={[styles.chip, reason === text && styles.chipSelected]}
              >
                <Text style={[styles.chipText, reason === text && styles.chipTextSelected]}>{text}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Type a reason..."
            maxLength={500} // same limit as the backend validator
            multiline
            style={styles.input}
          />

          <View style={styles.actions}>
            <Pressable onPress={onCancel} disabled={loading} style={styles.secondaryBtn}>
              <Text style={styles.secondaryText}>Back</Text>
            </Pressable>
            <Pressable
              onPress={() => onConfirm(reason.trim())}
              disabled={loading}
              style={[styles.dangerBtn, loading && styles.disabled]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.dangerText}>{confirmLabel}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { borderWidth: 1, borderColor: '#DDD', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipSelected: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextSelected: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    marginTop: 12,
    textAlignVertical: 'top', // Android: start text at the top
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  secondaryBtn: { paddingHorizontal: 16, paddingVertical: 12 },
  secondaryText: { fontSize: 15, color: '#333', fontWeight: '600' },
  dangerBtn: {
    backgroundColor: '#B42318',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  dangerText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
