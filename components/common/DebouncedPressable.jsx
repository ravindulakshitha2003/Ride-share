import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

export default function DebouncedPressable({
  onPress,
  disabled = false,
  debounceMs = 800,
  scaleTo = 0.97,
  style,
  children,
  ...props
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const lastPressRef = useRef(0);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  const handlePress = (e) => {
    const now = Date.now();
    if (now - lastPressRef.current < debounceMs) {
      return; // Suppress duplicate rapid clicks
    }
    lastPressRef.current = now;
    if (onPress) {
      onPress(e);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      {...props}
    >
      <Animated.View style={[{ transform: [{ scale }] }, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
