import type { Reaction } from './types.js';

// Generic event from non-Plaid data sources (Coinbase, Zerion, Spinwheel).
export type ExternalEventType =
  | 'crypto_received'
  | 'crypto_sent'
  | 'crypto_price_surge' // coin up >10% in 24h
  | 'crypto_price_drop' // coin down >10% in 24h
  | 'defi_yield'
  | 'wallet_receive'
  | 'debt_paydown'
  | 'debt_missed_payment'
  | 'new_liability';

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

    case 'crypto_price_surge':
      return {
        animation: 'celebrate',
        sound: 'fanfare',
        led: 'rainbow',
        duration: 5000,
        reason: `${event.symbol ?? 'Crypto'} surged >10% in 24h`,
      };

    case 'crypto_price_drop':
      return {
        animation: 'concerned',
        sound: 'warning',
        led: 'amber',
        duration: 3000,
        reason: `${event.symbol ?? 'Crypto'} dropped >10% in 24h`,
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

    case 'crypto_sent':
      return null;

    default: {
      // Exhaustiveness guard — TypeScript should catch unhandled cases at compile time.
      const _exhaustive: never = event.type;
      return _exhaustive;
    }
  }
}
