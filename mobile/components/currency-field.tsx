// Labeled numeric input for a dollar amount.

import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export function CurrencyField({
  label,
  hint,
  value,
  onChangeText,
}: {
  label: string;
  hint?: string;
  value: string;
  onChangeText: (next: string) => void;
}) {
  const text = useThemeColor({}, 'text');
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');
  const background = useThemeColor({}, 'background');

  return (
    <View style={styles.field}>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      {hint ? <ThemedText style={[styles.hint, { color: muted }]}>{hint}</ThemedText> : null}
      <View style={[styles.inputRow, { borderColor: border, backgroundColor: background }]}>
        <ThemedText style={[styles.prefix, { color: muted }]}>$</ThemedText>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0"
          placeholderTextColor={muted}
          style={[styles.input, { color: text }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 4,
  },
  hint: {
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  prefix: {
    fontSize: 16,
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: 46,
    fontSize: 16,
  },
});
