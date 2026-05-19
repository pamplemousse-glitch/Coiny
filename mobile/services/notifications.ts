// Expo push notification registration.
//
// Coiny's backend pushes a notification when a financial rule fires; the
// companion app then relays a BLE command to the device. This module only
// covers obtaining the Expo push token — the BLE relay needs hardware and is
// out of scope until Phase 3.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export type PushRegistration =
  | { status: 'granted'; token: string }
  | { status: 'denied'; reason: string }
  | { status: 'unsupported'; reason: string }
  | { status: 'error'; reason: string };

// Show alerts even when the app is foregrounded (handy while testing).
// Call once at app start — see app/_layout.tsx.
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

function resolveProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function registerForPushNotificationsAsync(): Promise<PushRegistration> {
  // Android needs an explicit channel before a token can be issued.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Coiny alerts',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Remote push tokens are not issued to simulators/emulators.
  if (!Device.isDevice) {
    return {
      status: 'unsupported',
      reason: 'Push tokens require a physical device — simulators cannot receive remote pushes.',
    };
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) {
    return { status: 'denied', reason: 'Notification permission was not granted.' };
  }

  const projectId = resolveProjectId();
  if (!projectId) {
    return {
      status: 'error',
      reason: 'No EAS project ID found. Run `eas init` to enable Expo push tokens.',
    };
  }

  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { status: 'granted', token: data };
  } catch {
    // Avoid logging the underlying error — it can include device identifiers.
    return { status: 'error', reason: 'Could not obtain an Expo push token.' };
  }
}
