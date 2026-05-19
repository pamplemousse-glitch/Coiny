import type { Reaction } from './types.js';

export function dispatchReaction(reaction: Reaction): void {
  const durationLabel = reaction.duration === 0 ? 'hold' : `${reaction.duration}ms`;
  console.log(`\n🐣 Coiny reacted:`);
  console.log(`   animation: ${reaction.animation}`);
  console.log(`   sound:     ${reaction.sound}`);
  console.log(`   led:       ${reaction.led}`);
  console.log(`   duration:  ${durationLabel}`);
  console.log(`   reason:    ${reaction.reason}\n`);
}
