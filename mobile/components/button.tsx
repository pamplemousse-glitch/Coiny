// Primary action button with a pressed state and optional busy spinner.

import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const tint = useThemeColor({}, 'tint');
  const inactive = disabled || busy;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: tint, opacity: inactive ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <ThemedText style={styles.label} lightColor="#fff" darkColor="#11181C">
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
