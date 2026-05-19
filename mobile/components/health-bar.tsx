// Horizontal progress bar for the pet's 0–100 health score.

import { StyleSheet, View } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { scoreColor } from '@/lib/format';

export function HealthBar({ score }: { score: number }) {
  const trackColor = useThemeColor({}, 'border');
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <View
        style={[styles.fill, { width: `${clamped}%`, backgroundColor: scoreColor(clamped) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
  },
});
