import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';
import { usePushRegistration } from '@/hooks/use-push-registration';
import { API_BASE_URL, TELLER_ENVIRONMENT } from '@/services/env';
import type { PushRegistration } from '@/services/notifications';

type IconName = 'target' | 'creditcard.fill';

function NavRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const tint = useThemeColor({}, 'tint');
  const muted = useThemeColor({}, 'muted');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.navRow, { opacity: pressed ? 0.6 : 1 }]}>
      <IconSymbol name={icon} size={24} color={tint} />
      <View style={styles.navText}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={[styles.subtitle, { color: muted }]}>{subtitle}</ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={18} color={muted} />
    </Pressable>
  );
}

function maskToken(token: string): string {
  return token.length > 24 ? `${token.slice(0, 21)}…]` : token;
}

function pushStatusLine(registration: PushRegistration): string {
  return registration.status === 'granted'
    ? `Registered — ${maskToken(registration.token)}`
    : registration.reason;
}

export default function SettingsScreen() {
  const router = useRouter();
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');
  const border = useThemeColor({}, 'border');
  const { registration, pending, register } = usePushRegistration();

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.content}>
      <Card style={styles.navCard}>
        <NavRow
          icon="target"
          title="Goals"
          subtitle="Budgets, savings target, thresholds"
          onPress={() => router.push('/goals')}
        />
        <View style={[styles.navDivider, { borderTopColor: border }]} />
        <NavRow
          icon="creditcard.fill"
          title="Link a bank"
          subtitle="Connect an account with Teller"
          onPress={() => router.push('/link-bank')}
        />
      </Card>

      <Card>
        <ThemedText type="subtitle">Push notifications</ThemedText>
        <ThemedText style={[styles.body, { color: muted }]}>
          Coiny pushes a notification when a financial rule fires. Register this device to
          receive an Expo push token.
        </ThemedText>
        <Button
          label={registration?.status === 'granted' ? 'Re-register device' : 'Enable notifications'}
          onPress={register}
          busy={pending}
          style={styles.button}
        />
        {registration ? (
          <ThemedText style={[styles.statusLine, { color: muted }]}>
            {pushStatusLine(registration)}
          </ThemedText>
        ) : null}
      </Card>

      <Card>
        <ThemedText type="subtitle">About</ThemedText>
        <View style={styles.aboutRow}>
          <ThemedText style={{ color: muted }}>Backend</ThemedText>
          <ThemedText>{API_BASE_URL}</ThemedText>
        </View>
        <View style={styles.aboutRow}>
          <ThemedText style={{ color: muted }}>Teller environment</ThemedText>
          <ThemedText>{TELLER_ENVIRONMENT}</ThemedText>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  navCard: {
    paddingVertical: 4,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  navText: {
    flex: 1,
    gap: 2,
  },
  navDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  subtitle: {
    fontSize: 13,
  },
  body: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 14,
  },
  button: {
    alignSelf: 'flex-start',
  },
  statusLine: {
    marginTop: 12,
    fontSize: 13,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
});
