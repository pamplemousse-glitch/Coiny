import { sendApnsPush } from '../push/apns.js';
import { isQuietHours } from '../push/quiet-hours.js';
import { latestDeviceTimezone, listDeviceTokens } from '../store/devices.js';
import { canSendPush, recordNotification } from '../store/notifications.js';
import type { Reaction } from './types.js';

// Only these animations may interrupt the user with an alert push. Everything
// else still updates the pet in-app on next open, silently. `happy` and
// `neutral` are deliberately absent: they are the most frequent reactions and
// the least worth a buzz. R-9.5's never-list (exogenous events, broken streaks,
// net worth decreases, credit score changes, "come back" pings) is enforced by
// this allowlist: those events never map to a pushable animation. Pinned by a
// test in tests/dispatch.test.ts; widening this set is a product decision, not
// a refactor.
export const PUSHABLE_ANIMATIONS = new Set(['celebrate', 'sad', 'concerned']);

// Push copy per docs/prd.md §10 (S-20 to S-22). No emoji anywhere (R-9.7).
// `sad` shares the S-21 concerned title: both are the "something needs your
// attention" family and the lock screen does not need the distinction.
const PUSH_TITLES: Record<string, string> = {
  celebrate: 'Coiny is celebrating',
  sad: 'Coiny noticed something',
  concerned: 'Coiny noticed something',
};

// Generic bodies (S-22). The reaction `reason` carries merchant names and
// amounts and must never leave the server: a push body renders on the lock
// screen, which is the least private surface on the device.
// See .claude/rules/security.md #2.
const PUSH_BODIES: Record<string, string> = {
  celebrate: 'Come see.',
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

// Pushes dispatch at event time today. R-9.6 (schedule deferrable pushes at the
// user's typical session time) and R-9.4 (the weekly digest) both belong to the
// scheduler (R-16.2), which another workstream owns. The seam is here: instead
// of `void fanOutPush(...)` above, dispatchReaction would hand deferrable
// events to the scheduler, which calls fanOutPush at the chosen time. The
// quiet-hours and budget gates below stay where they are either way, so a
// scheduled push is still re-checked at send time.
async function fanOutPush(userId: string, reaction: Reaction, eventType: string): Promise<void> {
  try {
    if (!PUSHABLE_ANIMATIONS.has(reaction.animation)) return;

    // Quiet hours (R-9.3): 21:00 to 08:00 user-local, no exceptions. When no
    // device has a stored timezone, suppress rather than guess: a wrong guess
    // is a 3am money notification and a revoked permission. Never fall back
    // to UTC or the server's zone.
    const timezone = await latestDeviceTimezone(userId);
    if (timezone === null) {
      console.log(`push suppressed reason=quiet_hours_unknown_tz event=${eventType}`);
      return;
    }
    if (isQuietHours(timezone)) return;

    if (!(await canSendPush(userId, eventType))) return;

    const tokens = await listDeviceTokens(userId);
    const ios = tokens.filter((t) => t.platform === 'ios');
    if (ios.length === 0) return;

    const title = PUSH_TITLES[reaction.animation] ?? 'Coiny reacted';
    const body = PUSH_BODIES[reaction.animation] ?? 'Come see.';
    const results = await Promise.allSettled(ios.map((t) => sendApnsPush(t.token, title, body)));

    const delivered = results.some((r) => r.status === 'fulfilled');
    if (delivered) await recordNotification(userId, eventType);

    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('APNs push failed:', r.reason);
      }
    }
  } catch (err) {
    console.error('Push fan-out error:', err);
  }
}
