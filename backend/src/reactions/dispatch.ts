import { sendApnsPush } from '../push/apns.js';
import { trackServerEvent } from '../store/analytics.js';
import { listDeviceTokens } from '../store/devices.js';
import { canSendPush, recordNotification } from '../store/notifications.js';
import type { Reaction } from './types.js';

// Only these animations may interrupt the user with an alert push. Everything
// else still updates the pet in-app on next open, silently. `happy` and
// `neutral` are deliberately absent: they are the most frequent reactions and
// the least worth a buzz.
const PUSHABLE_ANIMATIONS = new Set(['celebrate', 'sad', 'concerned']);

const PUSH_TITLES: Record<string, string> = {
  celebrate: '🎉 Coiny is celebrating!',
  happy: '😊 Coiny is happy!',
  sad: '😢 Coiny noticed something',
  concerned: '😟 Coiny is concerned',
  sleeping: '😴 Coiny is resting',
  neutral: '🐣 Coiny reacted',
};

// Generic bodies. The reaction `reason` carries merchant names and amounts and
// must never leave the server: a push body renders on the lock screen, which is
// the least private surface on the device. See .claude/rules/security.md #2.
const PUSH_BODIES: Record<string, string> = {
  celebrate: 'Something good happened. Come see.',
  sad: 'Something needs a look.',
  concerned: 'Something needs a look.',
};

export function dispatchReaction(userId: string, reaction: Reaction, eventType = 'reaction'): void {
  // Log the shape of the reaction, never the reason: it contains merchant names
  // and amounts (see .claude/rules/security.md #2).
  console.log(
    `reaction dispatched animation=${reaction.animation} sound=${reaction.sound} led=${reaction.led} duration=${reaction.duration} event=${eventType}`,
  );

  void fanOutPush(userId, reaction, eventType);
}

async function fanOutPush(userId: string, reaction: Reaction, eventType: string): Promise<void> {
  try {
    if (!PUSHABLE_ANIMATIONS.has(reaction.animation)) return;
    if (!(await canSendPush(userId, eventType))) return;

    const tokens = await listDeviceTokens(userId);
    const ios = tokens.filter((t) => t.platform === 'ios');
    if (ios.length === 0) return;

    const title = PUSH_TITLES[reaction.animation] ?? '🐣 Coiny reacted';
    const body = PUSH_BODIES[reaction.animation] ?? 'Come see.';
    const results = await Promise.allSettled(ios.map((t) => sendApnsPush(t.token, title, body)));

    const delivered = results.some((r) => r.status === 'fulfilled');
    if (delivered) {
      await recordNotification(userId, eventType);
      // Push budget audit signal (prd.md §9, R-24.2). Event type only, never
      // title/body (which are generic anyway by rule #2).
      await trackServerEvent(userId, 'push_sent', { type: eventType });
    }

    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('APNs push failed:', r.reason);
      }
    }
  } catch (err) {
    console.error('Push fan-out error:', err);
  }
}
