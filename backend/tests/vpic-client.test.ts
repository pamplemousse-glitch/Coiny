import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/util/fetch.js', () => ({
  fetchWithRetry: vi.fn(),
}));

import { fetchWithRetry } from '../src/util/fetch.js';

const mockedFetch = vi.mocked(fetchWithRetry);

// vPIC always answers 200 with exactly one Results object, and reports fields
// it could not determine as the EMPTY STRING rather than null. These fixtures
// are shaped from real responses captured against the live API.
function vpicResponse(fields: Record<string, string>): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ Results: [fields] }),
  } as unknown as Response;
}

const CLEAN_HONDA = {
  ErrorCode: '0',
  ErrorText: '0 - VIN decoded clean. Check Digit (9th position) is correct',
  Make: 'HONDA',
  Model: 'Accord',
  ModelYear: '2003',
  Trim: 'EX-V6',
  BodyClass: 'Coupe',
  VehicleType: 'PASSENGER CAR',
};

describe('decodeVin', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('decodes a clean VIN into its parts', async () => {
    mockedFetch.mockResolvedValue(vpicResponse(CLEAN_HONDA));

    const { decodeVin } = await import('../src/vpic/client.js');
    const decode = await decodeVin('1HGCM82633A004352');

    expect(decode).toEqual({
      make: 'HONDA',
      model: 'Accord',
      modelYear: 2003,
      trim: 'EX-V6',
      bodyClass: 'Coupe',
      vehicleType: 'PASSENGER CAR',
      errorCode: '0',
      usable: true,
    });
  });

  // ErrorCode 1 is a mistyped check digit. The rest of the VIN still decodes,
  // so the car is still nameable and still worth pricing.
  it('treats a failed check digit as usable when make and year decoded', async () => {
    mockedFetch.mockResolvedValue(
      vpicResponse({ ...CLEAN_HONDA, ErrorCode: '1', ErrorText: '1 - Check Digit (9th position) does not calculate' }),
    );

    const { decodeVin } = await import('../src/vpic/client.js');
    const decode = await decodeVin('1HGCM82633A004353');

    expect(decode?.usable).toBe(true);
    expect(decode?.make).toBe('HONDA');
  });

  // The case that saves a paid call: nothing decoded at all.
  it('reports not usable when no make or year could be decoded', async () => {
    mockedFetch.mockResolvedValue(
      vpicResponse({ ErrorCode: '6,7,11,400', ErrorText: '6 - Incomplete VIN', Make: '', Model: '', ModelYear: '' }),
    );

    const { decodeVin } = await import('../src/vpic/client.js');
    const decode = await decodeVin('NOTAVIN');

    expect(decode?.usable).toBe(false);
    expect(decode?.make).toBeNull();
    expect(decode?.errorCode).toBe('6,7,11,400');
  });

  it('normalises vPIC empty strings to null rather than empty values', async () => {
    mockedFetch.mockResolvedValue(vpicResponse({ ...CLEAN_HONDA, Trim: '', BodyClass: '   ' }));

    const { decodeVin } = await import('../src/vpic/client.js');
    const decode = await decodeVin('1HGCM82633A004352');

    expect(decode?.trim).toBeNull();
    expect(decode?.bodyClass).toBeNull();
  });

  // vPIC being down says nothing about the user's car. Same rule the chain
  // clients now follow: unknown is null, never a substantive answer.
  it('returns null when vPIC responds non-ok', async () => {
    mockedFetch.mockResolvedValue({ ok: false, status: 503 } as unknown as Response);

    const { decodeVin } = await import('../src/vpic/client.js');
    await expect(decodeVin('1HGCM82633A004352')).resolves.toBeNull();
  });

  it('returns null when the response shape is unrecognised', async () => {
    mockedFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ nope: true }) } as unknown as Response);

    const { decodeVin } = await import('../src/vpic/client.js');
    await expect(decodeVin('1HGCM82633A004352')).resolves.toBeNull();
  });
});

describe('describeVehicle', () => {
  it('names a car year-first, the way people say it', async () => {
    const { describeVehicle } = await import('../src/vpic/client.js');
    expect(
      describeVehicle({
        make: 'HONDA',
        model: 'Accord',
        modelYear: 2003,
        trim: 'EX-V6',
        bodyClass: 'Coupe',
        vehicleType: null,
        errorCode: '0',
        usable: true,
      }),
    ).toBe('2003 HONDA Accord EX-V6');
  });

  it('returns null when nothing decoded, so the caller can fall back', async () => {
    const { describeVehicle } = await import('../src/vpic/client.js');
    expect(
      describeVehicle({
        make: null,
        model: null,
        modelYear: null,
        trim: null,
        bodyClass: null,
        vehicleType: null,
        errorCode: '6',
        usable: false,
      }),
    ).toBeNull();
  });
});
