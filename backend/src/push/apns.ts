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

export async function sendApnsPush(deviceToken: string, title: string, body: string): Promise<void> {
  if (!config.APNS_KEY || !config.APNS_KEY_ID || !config.APNS_TEAM_ID) return;

  const jwt = await getJwt();
  const host =
    config.NODE_ENV === 'production' ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';

  const payload = JSON.stringify({
    aps: { alert: { title, body }, sound: 'default' },
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
      req.on('data', (chunk) => { responseBody += chunk; });
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
