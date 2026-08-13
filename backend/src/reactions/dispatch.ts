import { sendApnsPush } from '../push/apns.js';
import { isQuietHours } from '../push/quiet-hours.js';
import { trackServerEvent } from '../store/analytics.js';
import { latestDeviceTimezone, listDeviceTokens } from '../store/devices.js';
import { canSendPush, recordNotification } from '../store/notifications.js';
import { contractFor, PUSHABLE_EVENTS } from './contract.js';
import type { Reaction } from './types.js';

// Pushability is decided by the EVENT's contract row (reactions/contract.ts),
// not by the animation. The old animation allowlist could not tell
// overspend_vs_plan (concerned, R-9.5: never push) from bill_overdue
// (concerned, pushes once), so a single overspend could reach a lock screen.
// PUSHABLE_EVENTS holds exactly the events whose push policy is 'always' or
// 'once'; everything else still updates the pet in-app on next open, silently.
// R-9.5's never-list (exogenous events, missed periods, broken streaks, net
// worth decreases, credit score changes, a single overspend, "come back"
// pings) maps to 'never' in the contract and can never appear in this set.
// Pinned by tests in tests/dispatch.test.ts and tests/contract.test.ts;
// widening the set is a product decision, not a refactor.
export { PUSHABLE_EVENTS };

// Push copy per docs/prd.md section 10 (S-20 to S-22). No emoji anywhere
// (R-9.7). `sad` shares the S-21 concerned title: both are the "something
// needs your attention" family and the lock screen does not need the
// distinction.
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

export function dispatchReaction(userId: string, reaction: Reaction, eventType: string): void {
  // Log the shape of the reaction, never the reason: it contains merchant names
  // and amounts (see .claude/rules/security.md #2).
  console.log(
    `reaction dispatched animation=${reaction.animation} sound=${reaction.sound} led=${reaction.led} duration=${reaction.duration} event=${eventType}`,
  );

  void fanOutPush(userId, reaction, eventType);
}

// Pushes dispatch at event time today. R-9.6 (schedule deferrable pushes at the
// user's typical session time) and R-9.4 (the weekly digest, where the
// contract's 'digest' policy events would land) both belong to the scheduler
// (R-16.2), which another workstream owns. The seam is here: instead of
// `void fanOutPush(...)` above, dispatchReaction would hand deferrable
// events to the scheduler, which calls fanOutPush at the chosen time. The
// quiet-hours and budget gates below stay where they are either way, so a
// scheduled push is still re-checked at send time.
async function fanOutPush(userId: string, reaction: Reaction, eventType: string): Promise<void> {
  try {
    // The event contract gate (R-9.5). 'once' rides the same-type cooldown
    // inside canSendPush; 'digest'/'no'/'never' end here.
    const policy = contractFor(eventType).push;
    if (policy !== 'always' && policy !== 'once') return;

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
    if (delivered) {
      await recordNotification(userId, eventType);
      // Push budget audit signal (prd.md section 9, R-24.2). Event type only,
      // never title/body (which are generic anyway by rule #2).
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
