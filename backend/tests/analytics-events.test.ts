// Catalog tests for src/analytics/events.ts. The property whitelist is the
// privacy boundary (prd.md R-22.6): these tests prove PII-shaped values cannot
// fit through the schemas, not just that valid values do.

import { describe, expect, it } from 'vitest';
import {
  CLIENT_EVENT_SCHEMAS,
  isClientEvent,
  isServerEvent,
  SERVER_EVENT_SCHEMAS,
  usdValueBand,
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

  it('accepts a debounced wealth pull (the outcome the server cannot see)', () => {
    const result = validateClientEvent('wealth_refresh_pulled', { outcome: 'debounced' });
    expect(result).toEqual({ ok: true, properties: { outcome: 'debounced' } });
  });

  it('rejects a capped outcome on wealth_refresh_pulled (the cap is server-observed)', () => {
    const result = validateClientEvent('wealth_refresh_pulled', { outcome: 'capped' });
    expect(result).toEqual({ ok: false, reason: 'invalid_properties' });
  });

  it('accepts the offline banner render with a closed screen enum', () => {
    const result = validateClientEvent('offline_banner_shown', { screen: 'wealth' });
    expect(result).toEqual({ ok: true, properties: { screen: 'wealth' } });
  });

  it('accepts a repair prompt render carrying only the item status enum', () => {
    const result = validateClientEvent('repair_prompt_shown', { item_status: 'reauth_required' });
    expect(result).toEqual({ ok: true, properties: { item_status: 'reauth_required' } });
  });

  it('rejects an institution name riding on repair_prompt_shown (strict object, closed enum)', () => {
    const withExtraKey = validateClientEvent('repair_prompt_shown', {
      item_status: 'reauth_required',
      institution: 'Chase',
    });
    expect(withExtraKey).toEqual({ ok: false, reason: 'invalid_properties' });

    const inTheEnumSlot = validateClientEvent('repair_prompt_shown', { item_status: 'Chase' });
    expect(inTheEnumSlot).toEqual({ ok: false, reason: 'invalid_properties' });
  });

  it('rejects goal_created from a client (the server owns the mutation)', () => {
    const result = validateClientEvent('goal_created', {
      kind: 'save',
      target_band: '1k-10k',
      has_target_date: false,
      contribution_rule: 'recurring',
    });
    expect(result).toEqual({ ok: false, reason: 'server_only' });
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
    expect(
      SERVER_EVENT_SCHEMAS.goal_created.safeParse({
        kind: 'save',
        target_band: '1k-10k',
        has_target_date: true,
        contribution_rule: 'recurring',
      }).success,
    ).toBe(true);
    expect(
      SERVER_EVENT_SCHEMAS.goal_edited.safeParse({ kind: 'payoff', fields_changed: ['target_amount'] }).success,
    ).toBe(true);
    expect(SERVER_EVENT_SCHEMAS.goal_archived.safeParse({ kind: 'purchase' }).success).toBe(true);
    expect(SERVER_EVENT_SCHEMAS.net_worth_refreshed.safeParse({ bank: 'capped' }).success).toBe(true);
  });

  it('goal_created refuses a raw amount where the band belongs', () => {
    const result = SERVER_EVENT_SCHEMAS.goal_created.safeParse({
      kind: 'save',
      target_band: '5000',
      has_target_date: false,
      contribution_rule: 'manual',
    });
    expect(result.success).toBe(false);
  });

  it('goal_edited refuses a field name outside the closed vocabulary', () => {
    const result = SERVER_EVENT_SCHEMAS.goal_edited.safeParse({ kind: 'save', fields_changed: ['notes'] });
    expect(result.success).toBe(false);
  });
});

describe('usdValueBand', () => {
  it('buckets magnitudes into the section 8 bands, sign-insensitively', () => {
    expect(usdValueBand(0)).toBe('0-1k');
    expect(usdValueBand(999.99)).toBe('0-1k');
    expect(usdValueBand(1_000)).toBe('1k-10k');
    expect(usdValueBand(-5_000)).toBe('1k-10k');
    expect(usdValueBand(10_000)).toBe('10k-100k');
    expect(usdValueBand(100_000)).toBe('100k-1m');
    expect(usdValueBand(1_000_000)).toBe('1m+');
  });
});
