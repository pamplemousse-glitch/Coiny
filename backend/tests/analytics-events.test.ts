// Catalog tests for src/analytics/events.ts. The property whitelist is the
// privacy boundary (prd.md R-22.6): these tests prove PII-shaped values cannot
// fit through the schemas, not just that valid values do.

import { describe, expect, it } from 'vitest';
import {
  CLIENT_EVENT_SCHEMAS,
  isClientEvent,
  isServerEvent,
  SERVER_EVENT_SCHEMAS,
  validateClientEvent,
} from '../src/analytics/events.js';

describe('validateClientEvent', () => {
  it('accepts a well-formed app_open (the W4 signal)', () => {
    const result = validateClientEvent('app_open', { source: 'icon', days_since_signup: 3 });
    expect(result).toEqual({ ok: true, properties: { source: 'icon', days_since_signup: 3 } });
  });

  it('rejects an event name that is not in the catalog', () => {
    const result = validateClientEvent('made_up_event', {});
    expect(result).toEqual({ ok: false, reason: 'unknown_event' });
  });

  it('rejects a server-only event coming from a client', () => {
    const result = validateClientEvent('push_sent', { type: 'paycheck' });
    expect(result).toEqual({ ok: false, reason: 'server_only' });
  });

  it('rejects a merchant-name-shaped string (spaces and uppercase cannot pass the token rule)', () => {
    const result = validateClientEvent('link_result', { provider: 'Whole Foods Market', status: 'success' });
    expect(result).toEqual({ ok: false, reason: 'invalid_properties' });
  });

  it('rejects an email-shaped string (@ cannot pass the token rule)', () => {
    const result = validateClientEvent('link_opened', { provider: 'user@example.com', source: 'settings' });
    expect(result).toEqual({ ok: false, reason: 'invalid_properties' });
  });

  it('rejects an extra amount property (strict objects refuse unknown keys)', () => {
    const result = validateClientEvent('app_open', { source: 'icon', days_since_signup: 3, amount: 43.21 });
    expect(result).toEqual({ ok: false, reason: 'invalid_properties' });
  });

  it('rejects a raw value where a bucketed band is required', () => {
    const result = validateClientEvent('onboarding_declared', {
      classes: ['bank'],
      class_count: 1,
      value_band_by_class: { bank: '12345' },
    });
    expect(result).toEqual({ ok: false, reason: 'invalid_properties' });
  });

  it('accepts bucketed value bands in onboarding_declared', () => {
    const result = validateClientEvent('onboarding_declared', {
      classes: ['bank', 'crypto'],
      class_count: 2,
      value_band_by_class: { bank: '1k-10k', crypto: '0-1k' },
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a market-origin value outside the enum in reaction_shown', () => {
    const result = validateClientEvent('reaction_shown', { type: 'celebrate', origin: 'weather' });
    expect(result).toEqual({ ok: false, reason: 'invalid_properties' });
  });
});

describe('catalog partitioning', () => {
  it('no event name is both client and server', () => {
    const overlap = Object.keys(CLIENT_EVENT_SCHEMAS).filter((name) => isServerEvent(name));
    expect(overlap).toEqual([]);
  });

  it('the binding names from prd.md R-24.2 all exist in exactly one partition', () => {
    const binding = [
      'signup_completed',
      'onboarding_declared',
      'link_opened',
      'link_result',
      'account_connected',
      'first_number_shown',
      'app_open',
      'rung_started',
      'rung_completed',
      'rung_skipped',
      'rung_progress',
      'reaction_shown',
      'push_sent',
      'push_permission_changed',
      'sync_failed',
      'sync_completed',
      'scheduler_tick_completed',
      'scheduler_tick_skipped',
      'item_state_changed',
      'subscription_started',
      'subscription_churned',
    ];
    for (const name of binding) {
      expect(isClientEvent(name) || isServerEvent(name)).toBe(true);
    }
  });

  it('server schemas validate their own emitted shapes', () => {
    expect(SERVER_EVENT_SCHEMAS.signup_completed.safeParse({ method: 'apple' }).success).toBe(true);
    expect(SERVER_EVENT_SCHEMAS.item_state_changed.safeParse({ state: 'revoked' }).success).toBe(true);
    expect(
      SERVER_EVENT_SCHEMAS.guardrail_period_outcome.safeParse({
        guardrail_key: 'discretionary_weekly',
        outcome: 'passed',
        repair_used: false,
      }).success,
    ).toBe(true);
  });
});
