import type { FastifyInstance, FastifyRequest } from 'fastify';

/** RFC 9116 `Expires`. MANDATORY, exactly one, and it must be a real date in
 *  the future: a researcher reads a lapsed `Expires` as "this project stopped
 *  paying attention" and may skip the report entirely.
 *
 *  Kept under a year out, as RFC 9116 §2.5.5 recommends. `well-known.test.ts`
 *  fails once this drops inside 30 days, so the file cannot rot silently into
 *  expiry: the reminder to bump it arrives as a red test, not as a calendar
 *  entry nobody set. When bumping, re-verify the contact channel still works. */
const SECURITY_TXT_EXPIRES = '2027-08-01T00:00:00.000Z';

/** Where the disclosure policy lives. A repository URL, not a domain URL, on
 *  purpose: Coiny has no domain yet (audit §1.11.8 blocks the hosted file on
 *  that decision) and this one resolves today. */
const SECURITY_POLICY_URL = 'https://github.com/pamplemousse-glitch/Coiny/blob/main/SECURITY.md';

/** Primary intake. GitHub private vulnerability reporting on a public repo:
 *  it exists right now, it needs no domain and no mail alias, and it gives the
 *  reporter a tracked, private thread rather than an inbox that may not be read.
 *
 *  Deliberately NOT listing `contact@athanorworks.com` yet: PRD §29 and audit
 *  §1.11.9 both record that address as Unverified, domain and alias unconfirmed.
 *  Publishing a contact that might bounce is worse than publishing one channel
 *  that works, because the reporter's second move after a bounce is usually to
 *  give up or to go public. Add the `mailto:` line here, above this one, on the
 *  day the alias is confirmed to deliver. */
const SECURITY_CONTACT_URL = 'https://github.com/pamplemousse-glitch/Coiny/security/advisories/new';

/** Absolute origin this request arrived at, used for the `Canonical` field.
 *
 *  This is the "domain drops in later without a rewrite" mechanism: `Canonical`
 *  has to be an absolute URI, and hardcoding one would mean editing this file
 *  the day the domain lands and every time the staging hostname changes. Reading
 *  it back off the request means the served file is self-describing wherever it
 *  is served from, whether that is a `.fly.dev` hostname today or `coiny.app`
 *  later.
 *
 *  `x-forwarded-proto` is set by the Fly proxy, which terminates TLS. Trusting
 *  it here is safe in a way it would not be for an access-control decision: the
 *  worst a forged `Host` or proto can do is hand the sender a `Canonical` line
 *  pointing at their own value, in a public file with no secrets and no
 *  authority. Nothing downstream consumes it. */
function requestOrigin(req: FastifyRequest): string | null {
  const host = req.headers.host;
  if (!host) return null;
  const forwarded = req.headers['x-forwarded-proto'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  // A proxy chain may send a list ("https,http"); the first hop is the client's.
  const proto = raw?.split(',')[0]?.trim() || 'https';
  return `${proto}://${host}`;
}

export function buildSecurityTxt(origin: string | null): string {
  const lines = [
    '# Coiny, operated by Athanor Works LLC.',
    '# Coordinated vulnerability disclosure, per RFC 9116.',
    '#',
    '# Please report privately and give us a chance to fix it before publishing.',
    '# We aim to acknowledge within 5 business days. Coiny is a solo project, so',
    '# that is a good-faith target and not a contractual SLA.',
    '#',
    '# There is no bug bounty and no payment. Reports are still very welcome.',
    '',
    `Contact: ${SECURITY_CONTACT_URL}`,
    `Expires: ${SECURITY_TXT_EXPIRES}`,
    `Policy: ${SECURITY_POLICY_URL}`,
    'Preferred-Languages: en',
  ];
  if (origin) lines.push(`Canonical: ${origin}/.well-known/security.txt`);
  return `${lines.join('\n')}\n`;
}

/** Serves `/.well-known/security.txt` (RFC 9116) and closes audit row §1.11.8.
 *
 *  This is registered UNAUTHENTICATED, which makes it the fourth public route
 *  alongside `/health` and the two webhooks, so it is a deliberate exception to
 *  `.claude/rules/security.md` rule 5 rather than an oversight. RFC 9116 §3
 *  requires the file be retrievable at a well-known URI, and a disclosure
 *  channel behind a login is not a disclosure channel. It reads no input,
 *  touches no database and returns a constant, and the global rate limiter in
 *  `server.ts` still covers it via the IP fallback. */
export function registerWellKnownApi(app: FastifyInstance): void {
  app.get('/.well-known/security.txt', async (req, reply) => {
    // RFC 9116 §3 requires text/plain with charset utf-8.
    return reply
      .header('content-type', 'text/plain; charset=utf-8')
      .header('cache-control', 'public, max-age=86400')
      .send(buildSecurityTxt(requestOrigin(req)));
  });
}

export { SECURITY_TXT_EXPIRES };
