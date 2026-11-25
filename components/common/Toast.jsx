import React, { useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useToast } from '../../context/ToastContext';
import { colors } from '../../theme/colors';

const TOAST_THEMES = {
  success: {
    bg: colors.successSoft,
    border: colors.success,
    icon: 'checkmark-circle',
    iconColor: colors.success,
    defaultTitle: 'Success',
  },
  error: {
    bg: colors.errorSoft,
    border: colors.error,
    icon: 'alert-circle',
    iconColor: colors.error,
    defaultTitle: 'Error',
  },
  warning: {
    bg: colors.warningSoft,
    border: colors.warning,
    icon: 'warning',
    iconColor: colors.warning,
    defaultTitle: 'Notice',
  },
  info: {
    bg: colors.infoSoft,
    border: colors.info,
    icon: 'information-circle',
    iconColor: colors.info,
    defaultTitle: 'Information',
  },
};

export default function Toast() {
  const insets = useSafeAreaInsets();
  const { toast, hideToast } = useToast();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast.visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: insets.top + (Platform.OS === 'android' ? 12 : 6),
          useNativeDriver: true,
          bounciness: 6,
          speed: 14,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -120,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [toast.visible, insets.top, translateY, opacity]);

  if (!toast.visible && opacity._value === 0) {
    return null;
  }

  const currentTheme = TOAST_THEMES[toast.type] || TOAST_THEMES.info;

  return (
    <Animated.View
      pointerEvents={toast.visible ? 'auto' : 'none'}
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: currentTheme.bg,
          borderColor: currentTheme.border,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={currentTheme.icon} size={24} color={currentTheme.iconColor} />
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]}>
          {toast.title || currentTheme.defaultTitle}
        </Text>
        {toast.message ? (
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {toast.message}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={hideToast}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 6,
      },
    }),
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});
