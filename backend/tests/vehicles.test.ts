import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/vehicles/client.js', () => ({
  getVehicleValue: vi.fn(),
}));

vi.mock('../src/vpic/client.js', async (importOriginal) => ({
  // describeVehicle is pure, so the real one is kept: mocking it would make
  // the displayName assertions test the mock instead of the formatting.
  ...(await importOriginal<typeof import('../src/vpic/client.js')>()),
  decodeVin: vi.fn(),
}));

import { getVehicleValue } from '../src/vehicles/client.js';
import { decodeVin } from '../src/vpic/client.js';

const mockedGetVehicleValue = vi.mocked(getVehicleValue);
const mockedDecodeVin = vi.mocked(decodeVin);

describe('GET /api/vehicles', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockedDecodeVin.mockResolvedValue(null);
    await resetDatabase();
  });

  it('returns empty array when no vehicles registered', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/vehicles', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);

    await app.close();
  });

  it('returns 401 without auth', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/vehicles' });
    expect(res.statusCode).toBe(401);

    await app.close();
  });

  it('returns vehicles with null value before first sync', async () => {
    const { db } = await import('../src/db/client.js');
    const { vehicleAssets } = await import('../src/db/schema.js');
    await db().insert(vehicleAssets).values({ userId: testUserId, vin: '1HGCM82633A123456' });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/vehicles', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ vin: string; lastValueUsd: number | null }[]>();
    expect(body).toHaveLength(1);
    expect(body[0]?.vin).toBe('1HGCM82633A123456');
    expect(body[0]?.lastValueUsd).toBeNull();

    await app.close();
  });
});

describe('POST /api/vehicles', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockedDecodeVin.mockResolvedValue(null);
    await resetDatabase();
  });

  it('returns 400 for missing vin', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/vehicles',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ label: 'My car' }),
    });
    expect(res.statusCode).toBe(400);

    await app.close();
  });

  it('creates vehicle and returns 201', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'POST',
      url: '/api/vehicles',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      body: JSON.stringify({ vin: '2T1BURHE0JC043821', label: 'Toyota Corolla' }),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ ok: true, vin: '2T1BURHE0JC043821' });

    const list = await app.inject({ method: 'GET', url: '/api/vehicles', headers: authHeader() });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });

  it('silently ignores duplicate vin for same user', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const headers = { ...authHeader(), 'content-type': 'application/json' };
    const body = JSON.stringify({ vin: 'JTEBU5JR8A5034221' });

    await app.inject({ method: 'POST', url: '/api/vehicles', headers, body });
    const second = await app.inject({ method: 'POST', url: '/api/vehicles', headers, body });
    expect(second.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/api/vehicles', headers: authHeader() });
    expect(list.json()).toHaveLength(1);

    await app.close();
  });
});

describe('DELETE /api/vehicles/:id', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockedDecodeVin.mockResolvedValue(null);
    await resetDatabase();
  });

  it('removes vehicle and returns 204', async () => {
    const { db } = await import('../src/db/client.js');
    const { vehicleAssets } = await import('../src/db/schema.js');
    const [row] = await db().insert(vehicleAssets).values({ userId: testUserId, vin: 'WBAVD13546KV75102' }).returning();

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({
      method: 'DELETE',
      url: `/api/vehicles/${row!.id}`,
      headers: authHeader(),
    });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({ method: 'GET', url: '/api/vehicles', headers: authHeader() });
    expect(list.json()).toHaveLength(0);

    await app.close();
  });

  it('returns 204 even when vehicle does not exist', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'DELETE', url: '/api/vehicles/99999', headers: authHeader() });
    expect(res.statusCode).toBe(204);

    await app.close();
  });
});

describe('POST /api/vehicles/sync', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockedDecodeVin.mockResolvedValue(null);
    await resetDatabase();
  });

  it('returns synced: 0 when no vehicles', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/vehicles/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 0, errors: 0, skippedUndecodable: 0 });

    await app.close();
  });

  it('updates lastValueUsd and returns synced: 1', async () => {
    const { db } = await import('../src/db/client.js');
    const { vehicleAssets } = await import('../src/db/schema.js');
    await db().insert(vehicleAssets).values({ userId: testUserId, vin: '1HGCM82633A123456' });

    mockedGetVehicleValue.mockResolvedValue(22500);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/vehicles/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 1, errors: 0, skippedUndecodable: 0 });

    const list = await app.inject({ method: 'GET', url: '/api/vehicles', headers: authHeader() });
    const vehicle = list.json<{ lastValueUsd: number }[]>()[0];
    expect(vehicle?.lastValueUsd).toBeCloseTo(22500, 0);

    await app.close();
  });

  it('returns 402 when API key is missing', async () => {
    const { db } = await import('../src/db/client.js');
    const { vehicleAssets } = await import('../src/db/schema.js');
    await db().insert(vehicleAssets).values({ userId: testUserId, vin: '1HGCM82633A123456' });

    mockedGetVehicleValue.mockRejectedValue(new Error('MARKETCHECK_API_KEY not configured'));

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/vehicles/sync', headers: authHeader() });
    expect(res.statusCode).toBe(402);
    expect(res.json()).toMatchObject({ error: 'MARKETCHECK_API_KEY not configured' });

    await app.close();
  });

  it('counts non-config errors and continues syncing remaining vehicles', async () => {
    const { db } = await import('../src/db/client.js');
    const { vehicleAssets } = await import('../src/db/schema.js');
    await db()
      .insert(vehicleAssets)
      .values([
        { userId: testUserId, vin: 'FAILVIN0000000001' },
        { userId: testUserId, vin: 'OKVIN000000000001' },
      ]);

    mockedGetVehicleValue.mockRejectedValueOnce(new Error('API timeout')).mockResolvedValueOnce(18000);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/vehicles/sync', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ synced: 1, errors: 1, skippedUndecodable: 0 });

    await app.close();
  });
});

describe('GET /api/net-worth — vehicles field', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockedDecodeVin.mockResolvedValue(null);
    await resetDatabase();
  });

  it('includes vehicles: 0 when no assets', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ vehicles: number }>().vehicles).toBe(0);

    await app.close();
  });

  it('sums lastValueUsd from vehicle assets into vehicles total', async () => {
    const { db } = await import('../src/db/client.js');
    const { vehicleAssets } = await import('../src/db/schema.js');
    await db()
      .insert(vehicleAssets)
      .values([
        { userId: testUserId, vin: 'VIN1111111111', lastValueUsd: '22500.00' },
        { userId: testUserId, vin: 'VIN2222222222', lastValueUsd: '8750.25' },
        { userId: testUserId, vin: 'VIN3333333333', lastValueUsd: null },
      ]);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/api/net-worth', headers: authHeader() });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ vehicles: number }>();
    expect(body.vehicles).toBeCloseTo(31250.25, 1);

    await app.close();
  });
});

describe('vPIC VIN decode', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    mockedDecodeVin.mockResolvedValue(null);
    await resetDatabase();
  });

  it('stores the decode on add and names the car in the listing', async () => {
    mockedDecodeVin.mockResolvedValue({
      make: 'HONDA',
      model: 'Accord',
      modelYear: 2003,
      trim: 'EX-V6',
      bodyClass: 'Coupe',
      vehicleType: 'PASSENGER CAR',
      errorCode: '0',
      usable: true,
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const add = await app.inject({
      method: 'POST',
      url: '/api/vehicles',
      headers: authHeader(),
      payload: { vin: '1HGCM82633A004352' },
    });
    expect(add.statusCode).toBe(201);
    expect(add.json()).toMatchObject({ make: 'HONDA', modelYear: 2003, vinUsable: true });

    const list = await app.inject({ method: 'GET', url: '/api/vehicles', headers: authHeader() });
    const vehicle = list.json<{ displayName: string; make: string }[]>()[0];
    expect(vehicle?.displayName).toBe('2003 HONDA Accord EX-V6');

    await app.close();
  });

  it('prefers the user label over the decoded name', async () => {
    mockedDecodeVin.mockResolvedValue({
      make: 'HONDA',
      model: 'Accord',
      modelYear: 2003,
      trim: null,
      bodyClass: null,
      vehicleType: null,
      errorCode: '0',
      usable: true,
    });

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    await app.inject({
      method: 'POST',
      url: '/api/vehicles',
      headers: authHeader(),
      payload: { vin: '1HGCM82633A004352', label: "Dad's car" },
    });

    const list = await app.inject({ method: 'GET', url: '/api/vehicles', headers: authHeader() });
    expect(list.json<{ displayName: string }[]>()[0]?.displayName).toBe("Dad's car");

    await app.close();
  });

  // The whole reason this integration earns its place: MarketCheck's free tier
  // is 500 calls/month and the next step up is $299/month.
  it('skips the paid valuation call for a VIN vPIC could not decode', async () => {
    const { db } = await import('../src/db/client.js');
    const { vehicleAssets } = await import('../src/db/schema.js');
    await db()
      .insert(vehicleAssets)
      .values([
        { userId: testUserId, vin: 'GOODVIN1234567', vinUsable: true },
        { userId: testUserId, vin: 'NOTAVIN', vinUsable: false },
      ]);

    mockedGetVehicleValue.mockResolvedValue(22500);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/vehicles/sync', headers: authHeader() });
    expect(res.json()).toEqual({ synced: 1, errors: 0, skippedUndecodable: 1 });
    // The point of the whole feature: one call, not two.
    expect(mockedGetVehicleValue).toHaveBeenCalledTimes(1);
    expect(mockedGetVehicleValue).toHaveBeenCalledWith('GOODVIN1234567');

    await app.close();
  });

  // An absent opinion is not a negative one. Rows predating 0055, and rows
  // added while vPIC was down, must still reach MarketCheck.
  it('still values a vehicle whose VIN was never decoded', async () => {
    const { db } = await import('../src/db/client.js');
    const { vehicleAssets } = await import('../src/db/schema.js');
    await db().insert(vehicleAssets).values({ userId: testUserId, vin: 'LEGACYVIN12345', vinUsable: null });

    mockedGetVehicleValue.mockResolvedValue(15000);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/api/vehicles/sync', headers: authHeader() });
    expect(res.json()).toEqual({ synced: 1, errors: 0, skippedUndecodable: 0 });
    expect(mockedGetVehicleValue).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('still records the vehicle when vPIC is unreachable', async () => {
    mockedDecodeVin.mockResolvedValue(null);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const add = await app.inject({
      method: 'POST',
      url: '/api/vehicles',
      headers: authHeader(),
      payload: { vin: '1HGCM82633A004352' },
    });
    expect(add.statusCode).toBe(201);

    const list = await app.inject({ method: 'GET', url: '/api/vehicles', headers: authHeader() });
    const vehicle = list.json<{ displayName: string; vinUsable: boolean | null }[]>()[0];
    // Falls back to the VIN, exactly as every row read before 0055.
    expect(vehicle?.displayName).toBe('1HGCM82633A004352');
    expect(vehicle?.vinUsable).toBeNull();

    await app.close();
  });
});
