import { describe, expect, it } from 'vitest';
import { isQuietHours, isValidTimeZone, QUIET_HOURS_END, QUIET_HOURS_START } from '../src/push/quiet-hours.js';

// Asia/Tokyo is UTC+9 with no DST, so these instants are stable year-round.
const tokyo = (utcIso: string) => isQuietHours('Asia/Tokyo', new Date(utcIso));

describe('quiet hours (R-9.3)', () => {
  it('pins the window to 21:00 start', () => {
    expect(QUIET_HOURS_START).toBe(21);
  });

  it('pins the window to 08:00 end', () => {
    expect(QUIET_HOURS_END).toBe(8);
  });

  it('is quiet at 22:00 local time', () => {
    expect(tokyo('2026-08-13T13:00:00Z')).toBe(true); // 22:00 Tokyo
  });

  it('is not quiet at 09:00 local time', () => {
    expect(tokyo('2026-08-13T00:00:00Z')).toBe(false); // 09:00 Tokyo
  });

  it('starts exactly at 21:00 local time', () => {
    expect(tokyo('2026-08-13T12:00:00Z')).toBe(true); // 21:00 Tokyo
  });

  it('is not quiet at 20:59 local time', () => {
    expect(tokyo('2026-08-13T11:59:00Z')).toBe(false); // 20:59 Tokyo
  });

  it('is still quiet at 07:59 local time', () => {
    expect(tokyo('2026-08-12T22:59:00Z')).toBe(true); // 07:59 Tokyo
  });

  it('ends exactly at 08:00 local time', () => {
    expect(tokyo('2026-08-12T23:00:00Z')).toBe(false); // 08:00 Tokyo
  });

  it('respects DST-observing zones', () => {
    // 02:00 UTC on an August day is 22:00 the previous evening in New York
    // (EDT, UTC-4): quiet.
    expect(isQuietHours('America/New_York', new Date('2026-08-13T02:00:00Z'))).toBe(true);
  });
});

describe('isValidTimeZone', () => {
  it('accepts a real IANA identifier', () => {
    expect(isValidTimeZone('Asia/Tokyo')).toBe(true);
  });

  it('accepts UTC', () => {
    expect(isValidTimeZone('UTC')).toBe(true);
  });

  it('rejects a made-up identifier', () => {
    expect(isValidTimeZone('Not/AZone')).toBe(false);
  });

  it('rejects free text', () => {
    expect(isValidTimeZone('tomorrow morning')).toBe(false);
  });
});
