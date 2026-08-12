import type { Reaction } from './types.js';

// Generic event from non-Plaid data sources (Coinbase, Zerion, Spinwheel).
//
// PRINCIPLE: the pet reacts to what the user CONTROLS, never to the market.
// Do not add price-movement events here (a coin surging or dumping, a holding
// up or down N%). A creature that celebrates a pump and sulks at a dip punishes
// the user for something they did not do, on a day they already feel bad, and
// trains them to stop opening the app. It is also the mechanic Robinhood was
// sanctioned over. Market moves belong on the Wealth tab, reported neutrally.
// `crypto_price_surge` and `crypto_price_drop` were removed for this reason.
export type ExternalEventType =
  | 'crypto_received'
  | 'crypto_sent'
  | 'defi_yield'
  | 'wallet_receive'
  | 'debt_paydown'
  | 'debt_missed_payment'
  | 'new_liability'
  | 'net_worth_milestone' // crossed a round-number net worth threshold
  | 'credit_score_improved' // score up ≥20 points
  | 'credit_score_dropped'; // score down ≥20 points

export type ExternalEvent = {
  id: string;
  userId: string;
  type: ExternalEventType;
  amountUsd?: number;
  symbol?: string; // e.g. "BTC", "ETH"
  source: 'coinbase' | 'zerion' | 'spinwheel';
};

export function evaluateExternalEvent(event: ExternalEvent): Reaction | null {
  const amountStr = event.amountUsd !== undefined ? ` $${event.amountUsd.toFixed(2)}` : '';
  const symbolStr = event.symbol ? ` ${event.symbol}` : '';

  switch (event.type) {
    case 'crypto_received':
      return {
        animation: 'happy',
        sound: 'chime',
        led: 'green',
        duration: 3000,
        reason: `Crypto received:${symbolStr}${amountStr}`,
      };

    case 'wallet_receive':
      return {
        animation: 'happy',
        sound: 'chime',
        led: 'green',
        duration: 3000,
        reason: `Wallet received:${symbolStr}${amountStr}`,
      };

    case 'defi_yield':
      return {
        animation: 'happy',
        sound: 'coin',
        led: 'green',
        duration: 3000,
        reason: `DeFi yield earned:${symbolStr}${amountStr}`,
      };

    case 'debt_paydown':
      return {
        animation: 'celebrate',
        sound: 'chime',
        led: 'green',
        duration: 4000,
        reason: `Debt paid down:${amountStr}`,
      };

    case 'debt_missed_payment':
      return {
        animation: 'sad',
        sound: 'warning',
        led: 'red',
        duration: 4000,
        reason: `Missed debt payment:${amountStr}`,
      };

    case 'new_liability':
      return {
        animation: 'concerned',
        sound: 'warning',
        led: 'amber',
        duration: 3000,
        reason: `New liability detected:${amountStr}`,
      };

    // Non-reacting by design. These three are not things the user did.
    //
    // net_worth_milestone is mostly market movement: a crypto rally can carry
    // someone across $50k and the creature would celebrate a week in which they
    // saved nothing. The ladder supplies the celebration moments instead, and a
    // rung is only cleared by behaviour.
    //
    // credit_score_* moves on inquiries ageing off, a card issuer changing a
    // limit, or an account closing, none of which the user chose. A sad pet on a
    // score drop is the punishment mechanic this product exists to avoid.
    //
    // All three are still worth SHOWING on the Wealth tab, reported plainly.
    // They just do not move the creature.
    case 'net_worth_milestone':
    case 'credit_score_improved':
    case 'credit_score_dropped':
      return null;

    case 'crypto_sent':
      return null;

    default: {
      // Exhaustiveness guard: TypeScript catches unhandled cases at compile time.
      // Returning null (rather than the value) keeps runtime safe if an unknown
      // type ever arrives from an untyped caller, since callers branch on
      // truthiness and a raw string would dispatch a malformed reaction.
      const _exhaustive: never = event.type;
      void _exhaustive;
      return null;
    }
  }
}
