import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { CenteredMessage } from '@/components/centered-message';
import { ReactionRow } from '@/components/reaction-row';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useApi } from '@/hooks/use-api';
import { reasonDetail, reasonSlug, reasonTitle, relativeTime } from '@/lib/format';
import { getSpending, type SpendingItem } from '@/services/api';

const SPENDING_EMOJI: Record<string, string> = {
  paycheck_received: '💰',
  savings_milestone: '🎯',
  bill_paid_on_time: '🧾',
  overspent_in_category: '⚠️',
  large_purchase: '💸',
};

function spendingEmoji(reason: string): string {
  return SPENDING_EMOJI[reasonSlug(reason)] ?? '🪙';
}

export default function ActivityScreen() {
  const background = useThemeColor({}, 'background');
  const border = useThemeColor({}, 'border');
  const { data, error, loading, refreshing, refresh } = useApi(getSpending);

  if (loading) {
    return <CenteredMessage loading title="Loading activity…" />;
  }

  if (error || !data) {
    return (
      <CenteredMessage
        title="Couldn't load activity"
        detail={error ?? 'No spending data was returned.'}
      />
    );
  }

  return (
    <FlatList<SpendingItem>
      style={{ backgroundColor: background }}
      contentContainerStyle={data.length === 0 ? styles.emptyContent : styles.content}
      data={data}
      keyExtractor={(item, index) => `${item.at}-${index}`}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      ItemSeparatorComponent={() => (
        <View style={[styles.separator, { borderTopColor: border }]} />
      )}
      ListEmptyComponent={
        <CenteredMessage
          title="No activity yet"
          detail="Reactions show up here as Teller reports new transactions."
        />
      }
      renderItem={({ item }) => (
        <ReactionRow
          emoji={spendingEmoji(item.reason)}
          title={reasonTitle(item.reason)}
          detail={item.amount ?? reasonDetail(item.reason)}
          timeLabel={relativeTime(item.at)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyContent: {
    flexGrow: 1,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
