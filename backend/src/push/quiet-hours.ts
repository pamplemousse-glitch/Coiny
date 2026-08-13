// Quiet hours for user-facing push (docs/prd.md R-9.3): nothing between 21:00
// and 08:00 in the user's own timezone, no exceptions. The maths uses the Node
// built-in Intl.DateTimeFormat, so no dependency and no hand-rolled DST logic.
//
// Policy note for callers: when no timezone is known for a user, the push is
// suppressed, never sent on a guessed zone. A money notification at 3am is how
// push permission gets revoked forever.

export const QUIET_HOURS_START = 21; // inclusive, user-local
export const QUIET_HOURS_END = 8; // exclusive, user-local

// True when `tz` is an identifier the runtime's tz database accepts.
// Used at registration so an invalid identifier is rejected rather than
// stored and discovered at dispatch time.
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function localHour(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(at);
  const hour = parts.find((p) => p.type === 'hour')?.value;
  return Number(hour);
}

// True when `at` falls inside quiet hours in the given timezone. The window
// wraps midnight: [21:00, 24:00) and [00:00, 08:00).
export function isQuietHours(timeZone: string, at: Date = new Date()): boolean {
  const hour = localHour(timeZone, at);
  return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
}
