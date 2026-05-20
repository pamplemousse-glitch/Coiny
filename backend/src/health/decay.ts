// Mood decays toward a floor when the user goes quiet. Pure function — no
// state, no DB. Called on every read of pet state.
//
// Semantics:
// - Grace period after the last reaction (24h) during which mood holds steady
// - Then linear decay at DECAY_PER_DAY mood points per day
// - Never below FLOOR
// - If lastReactionAt is null (fresh pet), no decay applied
export const GRACE_HOURS = 24;
export const DECAY_PER_DAY = 5;
export const FLOOR = 20;

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

export function computeMoodWithDecay(
  storedMood: number,
  lastReactionAt: Date | null,
  now: Date = new Date(),
): number {
  if (!lastReactionAt) return storedMood;

  const elapsedMs = now.getTime() - lastReactionAt.getTime();
  const decayWindowMs = elapsedMs - GRACE_HOURS * MS_PER_HOUR;
  if (decayWindowMs <= 0) return storedMood;

  const decayDays = decayWindowMs / MS_PER_DAY;
  const decayed = storedMood - decayDays * DECAY_PER_DAY;
  return Math.max(FLOOR, Math.floor(decayed));
}
