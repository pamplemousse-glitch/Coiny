// Full-bleed centered state — used for loading, error, and empty placeholders.

import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export function CenteredMessage({
  title,
  detail,
  loading = false,
}: {
  title: string;
  detail?: string;
  loading?: boolean;
}) {
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={styles.container}>
      {loading ? <ActivityIndicator color={tint} style={styles.spinner} /> : null}
      <ThemedText type="defaultSemiBold" style={styles.title}>
        {title}
      </ThemedText>
      {detail ? (
        <ThemedText style={[styles.detail, { color: muted }]}>{detail}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  spinner: {
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  detail: {
    textAlign: 'center',
    fontSize: 14,
  },
});
