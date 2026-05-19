// Small presentation helpers shared across screens.

import type { Animation } from '@/services/api';

const ANIMATION_EMOJI: Record<Animation, string> = {
  happy: '😊',
  sad: '😢',
  celebrate: '🎉',
  concerned: '😟',
  neutral: '😐',
  sleeping: '😴',
};

export function animationEmoji(animation: Animation): string {
  return ANIMATION_EMOJI[animation] ?? '😐';
}

export type Mood = {
  label: string;
  emoji: string;
};

// Backend keeps mood == healthScore, so a single score drives the mood label.
export function moodForScore(score: number): Mood {
  if (score >= 75) return { label: 'Thriving', emoji: '😄' };
  if (score >= 50) return { label: 'Content', emoji: '🙂' };
  if (score >= 25) return { label: 'Uneasy', emoji: '😟' };
  return { label: 'Distressed', emoji: '😣' };
}

export function scoreColor(score: number): string {
  if (score >= 67) return '#2e9e5b';
  if (score >= 34) return '#d99a16';
  return '#cf3b3b';
}

// The rule-name prefix of a `reason` string, e.g.
// "paycheck_received (Direct Deposit $500.00)" -> "paycheck_received".
export function reasonSlug(reason: string): string {
  return reason.split('(')[0]?.trim() ?? reason;
}

// Turns a rule's `reason` string into a human label, e.g. "Paycheck received".
export function reasonTitle(reason: string): string {
  const slug = reasonSlug(reason);
  if (!slug) return reason;
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, ' ');
}

export function reasonDetail(reason: string): string | null {
  const match = reason.match(/\(([^)]*)\)/);
  return match ? match[1] : null;
}

// Relative time, e.g. "just now", "5m ago", "3h ago", "2d ago".
export function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';

  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 45) return 'just now';
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  return `${Math.round(diffSec / 86400)}d ago`;
}
