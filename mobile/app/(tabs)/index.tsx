import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { CenteredMessage } from '@/components/centered-message';
import { ReactionRow } from '@/components/reaction-row';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { HealthBar } from '@/components/health-bar';
import { useApi } from '@/hooks/use-api';
import { animationEmoji, moodForScore, reasonDetail, reasonTitle, relativeTime } from '@/lib/format';
import { getPet } from '@/services/api';

const RECENT_LIMIT = 5;

export default function PetScreen() {
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');
  const { data, error, loading, refreshing, refresh } = useApi(getPet);

  if (loading) {
    return <CenteredMessage loading title="Waking up your pet…" />;
  }

  if (error || !data) {
    return (
      <CenteredMessage
        title="Couldn't reach Coiny"
        detail={error ?? 'No pet data was returned. Pull down to retry.'}
      />
    );
  }

  const mood = moodForScore(data.healthScore);
  const recent = data.reactionHistory.slice(0, RECENT_LIMIT);

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
      <Card style={styles.heroCard}>
        <ThemedText style={styles.heroEmoji}>{mood.emoji}</ThemedText>
        <ThemedText type="title">{mood.label}</ThemedText>
        <ThemedText style={{ color: muted }}>
          Last reaction {relativeTime(data.lastReactionAt)}
        </ThemedText>
      </Card>

      <Card>
        <View style={styles.scoreHeader}>
          <ThemedText type="defaultSemiBold">Health score</ThemedText>
          <ThemedText type="defaultSemiBold">{Math.round(data.healthScore)} / 100</ThemedText>
        </View>
        <HealthBar score={data.healthScore} />
      </Card>

      <Card>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Recent reactions
        </ThemedText>
        {recent.length === 0 ? (
          <ThemedText style={{ color: muted }}>
            No reactions yet. They appear as your bank activity comes in.
          </ThemedText>
        ) : (
          recent.map((record, index) => (
            <View
              key={`${record.at}-${index}`}
              style={index > 0 ? [styles.divider, { borderTopColor: border }] : undefined}>
              <ReactionRow
                emoji={animationEmoji(record.reaction.animation)}
                title={reasonTitle(record.reaction.reason)}
                detail={reasonDetail(record.reaction.reason)}
                timeLabel={relativeTime(record.at)}
              />
            </View>
          ))
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  heroCard: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 28,
  },
  heroEmoji: {
    fontSize: 72,
    lineHeight: 84,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
