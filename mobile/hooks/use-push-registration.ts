// Drives the push-notification opt-in flow for the Settings screen.

import { useCallback, useState } from 'react';

import { registerForPushNotificationsAsync, type PushRegistration } from '@/services/notifications';

export type PushRegistrationState = {
  registration: PushRegistration | null;
  pending: boolean;
  register: () => void;
};

export function usePushRegistration(): PushRegistrationState {
  const [registration, setRegistration] = useState<PushRegistration | null>(null);
  const [pending, setPending] = useState(false);

  const register = useCallback(() => {
    setPending(true);
    void (async () => {
      try {
        setRegistration(await registerForPushNotificationsAsync());
      } catch {
        setRegistration({ status: 'error', reason: 'Registration failed unexpectedly.' });
      } finally {
        setPending(false);
      }
    })();
  }, []);

  return { registration, pending, register };
}
