import { createPrivateKey } from 'node:crypto';
import http2 from 'node:http2';
import { SignJWT } from 'jose';
import { config } from '../config.js';

// JWT is valid for 1 hour; we refresh 60s before expiry.
let cached: { jwt: string; iat: number } | null = null;

async function getJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && now - cached.iat < 3540) return cached.jwt;

  const key = createPrivateKey({ key: config.APNS_KEY, format: 'pem' });
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.APNS_KEY_ID })
    .setIssuer(config.APNS_TEAM_ID)
    .setIssuedAt()
    .sign(key);

  cached = { jwt, iat: now };
  return jwt;
}

/** Which APNs host will accept a token, given the environment the app reported
 *  when it registered.
 *
 *  This is a property of the BUILD that produced the token, never of the server
 *  holding it. That distinction used to be invisible because the two moved
 *  together (Debug -> staging, Release -> production), so APP_ENV was a
 *  faithful proxy and this file said so. Pointing the TestFlight build at
 *  staging broke the correspondence: staging now serves production tokens from
 *  TestFlight and sandbox tokens from Xcode Debug runs simultaneously, and no
 *  single server-side value is right for both. APNs answers a mismatched
 *  pairing with 400 BadDeviceToken, which no user and no dashboard ever sees.
 *
 *  `null` is a token registered before migration 0070 added the column. Those
 *  fall back to the old heuristic, which is still correct for them: they can
 *  only have come from a build predating the retarget, when the correspondence
 *  did hold. Note this is APP_ENV and never NODE_ENV, which is 'production' on
 *  staging too and deliberately so (config.ts). Same trap as PLAID_ENV.
 *
 *  Exported for the test, which is the only thing that pins the mapping. */
export function apnsHostFor(apsEnvironment: string | null): string {
  if (apsEnvironment === 'production') return 'api.push.apple.com';
  if (apsEnvironment === 'development') return 'api.sandbox.push.apple.com';
  return config.APP_ENV === 'production' ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';
}

export async function sendApnsPush(
  deviceToken: string,
  title: string,
  body: string,
  apsEnvironment: string | null = null,
): Promise<void> {
  if (!config.APNS_KEY || !config.APNS_KEY_ID || !config.APNS_TEAM_ID) return;

  const jwt = await getJwt();
  const host = apnsHostFor(apsEnvironment);

  const payload = JSON.stringify({
    aps: { alert: { title, body }, sound: 'default', 'content-available': 1 },
  });

  await new Promise<void>((resolve, reject) => {
    const session = http2.connect(`https://${host}`);
    session.once('error', reject);

    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': config.APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
      'content-length': String(Buffer.byteLength(payload)),
    });

    req.write(payload);
    req.end();

    req.once('response', (headers) => {
      const status = headers[':status'];
      let responseBody = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        responseBody += chunk;
      });
      req.once('end', () => {
        session.close();
        if (status === 200) {
          resolve();
        } else {
          reject(new Error(`APNs ${status} for token ${deviceToken.slice(0, 8)}…: ${responseBody}`));
        }
      });
    });
  });
}
