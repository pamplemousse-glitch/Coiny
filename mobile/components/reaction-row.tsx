// A single row in a reaction / spending history list.

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ReactionRowProps = {
  emoji: string;
  title: string;
  detail: string | null;
  timeLabel: string;
};

export function ReactionRow({ emoji, title, detail, timeLabel }: ReactionRowProps) {
  const muted = useThemeColor({}, 'muted');

  return (
    <View style={styles.row}>
      <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      <View style={styles.body}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        {detail ? (
          <ThemedText style={[styles.detail, { color: muted }]}>{detail}</ThemedText>
        ) : null}
      </View>
      <ThemedText style={[styles.time, { color: muted }]}>{timeLabel}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  emoji: {
    fontSize: 26,
    lineHeight: 32,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  detail: {
    fontSize: 13,
  },
  time: {
    fontSize: 12,
  },
});
