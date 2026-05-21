import { sendApnsPush } from '../push/apns.js';
import { listDeviceTokens } from '../store/devices.js';
import type { Reaction } from './types.js';

const PUSH_TITLES: Record<string, string> = {
  celebrate: '🎉 Coiny is celebrating!',
  happy: '😊 Coiny is happy!',
  sad: '😢 Coiny noticed something',
  concerned: '😟 Coiny is concerned',
  sleeping: '😴 Coiny is resting',
  neutral: '🐣 Coiny reacted',
};

export function dispatchReaction(reaction: Reaction): void {
  const durationLabel = reaction.duration === 0 ? 'hold' : `${reaction.duration}ms`;
  console.log(`\n🐣 Coiny reacted:`);
  console.log(`   animation: ${reaction.animation}`);
  console.log(`   sound:     ${reaction.sound}`);
  console.log(`   led:       ${reaction.led}`);
  console.log(`   duration:  ${durationLabel}`);
  console.log(`   reason:    ${reaction.reason}\n`);

  void fanOutPush(reaction);
}

async function fanOutPush(reaction: Reaction): Promise<void> {
  try {
    const tokens = await listDeviceTokens();
    const ios = tokens.filter((t) => t.platform === 'ios');
    if (ios.length === 0) return;

    const title = PUSH_TITLES[reaction.animation] ?? '🐣 Coiny reacted';
    const results = await Promise.allSettled(ios.map((t) => sendApnsPush(t.token, title, reaction.reason)));

    for (const r of results) {
      if (r.status === 'rejected') {
        console.error('APNs push failed:', r.reason);
      }
    }
  } catch (err) {
    console.error('Push fan-out error:', err);
  }
}
