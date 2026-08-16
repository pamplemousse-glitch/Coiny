import { execFileSync } from 'node:child_process';
import { sign as cryptoSign, X509Certificate } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Generates a locally trusted three-certificate chain (root -> intermediate ->
// leaf) shaped like the one Apple attaches to App Store signed data, including
// the marker OIDs the verifier requires. Uses the openssl CLI because Node
// cannot mint X.509 certificates; config files (not -addext) keep it working
// on both OpenSSL and LibreSSL. Tests install chain.roots via
// setTrustedRootsForTesting() and sign payloads with signJws().

export interface TestChain {
  x5c: [string, string, string]; // base64 DER: leaf, intermediate, root
  leafKeyPem: string;
  roots: X509Certificate[];
}

const LEAF_OID = '1.2.840.113635.100.6.11.1';
const INTERMEDIATE_OID = '1.2.840.113635.100.6.2.1';

function reqConfig(cn: string, extLines: string[]): string {
  return [
    '[req]',
    'distinguished_name = dn',
    'x509_extensions = ext',
    'req_extensions = ext',
    'prompt = no',
    '[dn]',
    `CN = ${cn}`,
    '[ext]',
    ...extLines,
    '',
  ].join('\n');
}

function openssl(args: string[], cwd: string): void {
  execFileSync('openssl', args, { cwd, stdio: 'pipe' });
}

function pemToBase64Der(pemPath: string): { b64: string; cert: X509Certificate } {
  const cert = new X509Certificate(readFileSync(pemPath));
  return { b64: cert.raw.toString('base64'), cert };
}

export interface ChainOptions {
  // Drop a marker OID to exercise the missing_marker_oid rejection.
  omitLeafOid?: boolean;
  omitIntermediateOid?: boolean;
}

export function generateChain(options: ChainOptions = {}): TestChain {
  const dir = mkdtempSync(join(tmpdir(), 'coiny-appstore-'));
  try {
    const caExt = ['basicConstraints = critical,CA:true'];
    const interExt = [
      'basicConstraints = critical,CA:true',
      ...(options.omitIntermediateOid ? [] : [`${INTERMEDIATE_OID} = ASN1:NULL`]),
    ];
    const leafExt = [
      'basicConstraints = critical,CA:false',
      ...(options.omitLeafOid ? [] : [`${LEAF_OID} = ASN1:NULL`]),
    ];

    writeFileSync(join(dir, 'root.cnf'), reqConfig('Coiny Test Apple Root', caExt));
    writeFileSync(join(dir, 'inter.cnf'), reqConfig('Coiny Test Intermediate', interExt));
    writeFileSync(join(dir, 'leaf.cnf'), reqConfig('Coiny Test StoreKit Signing', leafExt));
    writeFileSync(join(dir, 'inter.ext'), interExt.join('\n'));
    writeFileSync(join(dir, 'leaf.ext'), leafExt.join('\n'));

    for (const name of ['root', 'inter', 'leaf']) {
      openssl(['ecparam', '-name', 'prime256v1', '-genkey', '-noout', '-out', `${name}.key`], dir);
    }

    // Self-signed root.
    openssl(
      ['req', '-x509', '-new', '-key', 'root.key', '-out', 'root.pem', '-days', '36500', '-config', 'root.cnf'],
      dir,
    );
    // Intermediate signed by root.
    openssl(['req', '-new', '-key', 'inter.key', '-out', 'inter.csr', '-config', 'inter.cnf'], dir);
    openssl(
      [
        'x509',
        '-req',
        '-in',
        'inter.csr',
        '-CA',
        'root.pem',
        '-CAkey',
        'root.key',
        '-CAcreateserial',
        '-out',
        'inter.pem',
        '-days',
        '36500',
        '-extfile',
        'inter.ext',
      ],
      dir,
    );
    // Leaf signed by intermediate.
    openssl(['req', '-new', '-key', 'leaf.key', '-out', 'leaf.csr', '-config', 'leaf.cnf'], dir);
    openssl(
      [
        'x509',
        '-req',
        '-in',
        'leaf.csr',
        '-CA',
        'inter.pem',
        '-CAkey',
        'inter.key',
        '-CAcreateserial',
        '-out',
        'leaf.pem',
        '-days',
        '36500',
        '-extfile',
        'leaf.ext',
      ],
      dir,
    );

    const leaf = pemToBase64Der(join(dir, 'leaf.pem'));
    const inter = pemToBase64Der(join(dir, 'inter.pem'));
    const root = pemToBase64Der(join(dir, 'root.pem'));
    const leafKeyPem = readFileSync(join(dir, 'leaf.key'), 'utf8');

    return { x5c: [leaf.b64, inter.b64, root.b64], leafKeyPem, roots: [root.cert] };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function base64Url(input: Buffer): string {
  return input.toString('base64url');
}

export interface SignOptions {
  alg?: string;
  x5c?: string[];
  // Corrupt the signature to exercise the invalid_signature rejection.
  breakSignature?: boolean;
}

/** Signs a payload as an App Store style JWS with the chain's leaf key. */
export function signJws(payload: unknown, chain: TestChain, options: SignOptions = {}): string {
  const header = { alg: options.alg ?? 'ES256', x5c: options.x5c ?? chain.x5c };
  const headerB64 = base64Url(Buffer.from(JSON.stringify(header), 'utf8'));
  const payloadB64 = base64Url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const signature = cryptoSign('sha256', Buffer.from(`${headerB64}.${payloadB64}`, 'utf8'), {
    key: chain.leafKeyPem,
    dsaEncoding: 'ieee-p1363',
  });
  if (options.breakSignature) signature[0] = signature[0]! ^ 0xff;
  return `${headerB64}.${payloadB64}.${base64Url(signature)}`;
}

// --- Payload builders --------------------------------------------------------

let transactionCounter = 0;

export function transactionPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  transactionCounter += 1;
  const now = Date.now();
  return {
    transactionId: `t_${transactionCounter}`,
    originalTransactionId: 'orig_tx_1',
    productId: 'app.coiny.individual.annual',
    bundleId: 'app.coiny.test',
    environment: 'Sandbox',
    type: 'Auto-Renewable Subscription',
    purchaseDate: now - 1000,
    expiresDate: now + 365 * 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

export function renewalInfoPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    originalTransactionId: 'orig_tx_1',
    autoRenewProductId: 'app.coiny.individual.annual',
    autoRenewStatus: 1,
    environment: 'Sandbox',
    ...overrides,
  };
}

export interface NotificationOptions {
  type: string;
  subtype?: string;
  uuid?: string;
  transaction?: Record<string, unknown> | null;
  renewal?: Record<string, unknown> | null;
  // Envelope-level environment. Defaults to Sandbox, like every notification
  // this codebase has ever received.
  environment?: string;
}

let notificationCounter = 0;

/** Builds a fully signed ResponseBodyV2: envelope, transaction and renewal
 *  info each carry their own JWS, exactly as Apple delivers them. */
export function signedNotification(chain: TestChain, options: NotificationOptions): string {
  notificationCounter += 1;
  const data: Record<string, unknown> = {
    environment: options.environment ?? 'Sandbox',
    bundleId: 'app.coiny.test',
  };
  if (options.transaction !== null) {
    data.signedTransactionInfo = signJws(options.transaction ?? transactionPayload(), chain);
  }
  if (options.renewal !== undefined && options.renewal !== null) {
    data.signedRenewalInfo = signJws(options.renewal, chain);
  }
  const payload = {
    notificationType: options.type,
    ...(options.subtype ? { subtype: options.subtype } : {}),
    notificationUUID: options.uuid ?? `uuid-${notificationCounter}`,
    signedDate: Date.now(),
    data,
  };
  return signJws(payload, chain);
}
