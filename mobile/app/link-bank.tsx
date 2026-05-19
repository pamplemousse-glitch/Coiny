import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { CenteredMessage } from '@/components/centered-message';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { TELLER_APPLICATION_ID, TELLER_ENVIRONMENT } from '@/services/env';

type LinkState =
  | { phase: 'idle' }
  | { phase: 'connecting' }
  | { phase: 'linked'; institution: string }
  | { phase: 'error'; reason: string };

// Minimal shape of the Teller Connect onSuccess payload that we actually read.
// The full payload also carries an access token — see the security note below.
type TellerEnrollment = {
  enrollment?: { institution?: { name?: string } };
};

// HTML host page for the Teller Connect widget. It loads connect.js, opens the
// flow, and relays each callback back to React Native via postMessage.
function connectHtml(): string {
  const appId = JSON.stringify(TELLER_APPLICATION_ID);
  const env = JSON.stringify(TELLER_ENVIRONMENT);
  return `<!DOCTYPE html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" /></head>
  <body>
    <script src="https://cdn.teller.io/connect/connect.js"></script>
    <script>
      function post(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
      try {
        var teller = TellerConnect.setup({
          applicationId: ${appId},
          environment: ${env},
          selectAccount: 'multiple',
          onSuccess: function (enrollment) { post({ type: 'success', enrollment: enrollment }); },
          onExit: function () { post({ type: 'exit' }); },
          onFailure: function (failure) { post({ type: 'failure', failure: failure }); }
        });
        teller.open();
      } catch (err) {
        post({ type: 'failure', failure: { message: String(err) } });
      }
    </script>
  </body>
</html>`;
}

export default function LinkBankScreen() {
  const background = useThemeColor({}, 'background');
  const muted = useThemeColor({}, 'muted');
  const tint = useThemeColor({}, 'tint');
  const [state, setState] = useState<LinkState>({ phase: 'idle' });

  if (!TELLER_APPLICATION_ID) {
    return (
      <CenteredMessage
        title="Teller is not configured"
        detail="Set EXPO_PUBLIC_TELLER_APPLICATION_ID in mobile/.env, then reload the app."
      />
    );
  }

  const onMessage = (event: WebViewMessageEvent) => {
    // Security: the success payload contains a Teller access token. Never log
    // the raw message — only read the institution name for display. The token
    // belongs server-side; wiring it to the backend is a later (Phase 3) task.
    let message: { type?: string; enrollment?: TellerEnrollment; failure?: { message?: string } };
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      setState({ phase: 'error', reason: 'Received an unreadable response from Teller.' });
      return;
    }

    if (message.type === 'success') {
      const institution =
        message.enrollment?.enrollment?.institution?.name ?? 'your bank';
      setState({ phase: 'linked', institution });
    } else if (message.type === 'exit') {
      setState({ phase: 'idle' });
    } else {
      setState({
        phase: 'error',
        reason: message.failure?.message ?? 'Teller Connect could not complete.',
      });
    }
  };

  if (state.phase === 'connecting') {
    return (
      <View style={[styles.flex, { backgroundColor: background }]}>
        <WebView
          originWhitelist={['*']}
          source={{ html: connectHtml() }}
          onMessage={onMessage}
          startInLoadingState
          renderLoading={() => (
            <View style={[styles.loading, { backgroundColor: background }]}>
              <ActivityIndicator color={tint} />
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: background }} contentContainerStyle={styles.content}>
      {state.phase === 'linked' ? (
        <Card style={styles.statusCard}>
          <ThemedText style={styles.emoji}>🔗</ThemedText>
          <ThemedText type="subtitle">Bank linked</ThemedText>
          <ThemedText style={[styles.body, { color: muted }]}>
            {state.institution} is connected. Coiny will react as transactions arrive.
          </ThemedText>
        </Card>
      ) : null}

      {state.phase === 'error' ? (
        <Card style={styles.statusCard}>
          <ThemedText style={styles.emoji}>⚠️</ThemedText>
          <ThemedText type="subtitle">Linking didn&apos;t finish</ThemedText>
          <ThemedText style={[styles.body, { color: muted }]}>{state.reason}</ThemedText>
        </Card>
      ) : null}

      {state.phase === 'idle' ? (
        <Card>
          <ThemedText type="subtitle">Connect your bank</ThemedText>
          <ThemedText style={[styles.body, { color: muted }]}>
            Coiny uses Teller to read transactions from your bank. You&apos;ll sign in with
            your bank in a secure Teller window — Coiny never sees your password.
          </ThemedText>
          <ThemedText style={[styles.envNote, { color: muted }]}>
            Teller environment: {TELLER_ENVIRONMENT}
          </ThemedText>
        </Card>
      ) : null}

      <Button
        label={state.phase === 'linked' ? 'Link another bank' : 'Open Teller Connect'}
        onPress={() => setState({ phase: 'connecting' })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  statusCard: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  emoji: {
    fontSize: 48,
    lineHeight: 56,
  },
  body: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  envNote: {
    fontSize: 13,
    marginTop: 12,
  },
});
