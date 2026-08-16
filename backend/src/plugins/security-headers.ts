import type { FastifyInstance } from 'fastify';

/** Response security headers for a JSON-only API.
 *
 *  WHY NOT `@fastify/helmet`: the pre-launch security audit (§1.10.1) looked at
 *  this exact question and recommended against the dependency. Coiny's backend
 *  serves JSON to two native clients and renders no HTML, so almost every header
 *  helmet sets by default governs a browser document that does not exist here.
 *  Adding helmet would buy the two headers below and pay for them with a new
 *  supply-chain surface on a service whose seven production dependencies are,
 *  per §1.9.12, "the single most valuable supply-chain property this repository
 *  has". That is the trade `.claude/rules/security.md` rule 7 exists to refuse.
 *
 *  Set deliberately:
 *
 *  - `Strict-Transport-Security` (§1.6.2). `fly.toml:44` sets `force_https`,
 *    which *redirects* a plaintext request but never *instructs* the client not
 *    to send one again. HSTS closes that first-request window. One year,
 *    `includeSubDomains`, and deliberately NOT `preload`: preloading is a
 *    hard-to-reverse commitment baked into browser binaries, and Coiny has no
 *    domain yet (see the security.txt route), so there is nothing to commit.
 *    Sent unconditionally: RFC 6797 §7.2 requires a user agent to ignore this
 *    header when it arrives over plaintext, so gating on the protocol would add
 *    a dependency on proxy-header trust (`trustProxy` is not enabled on this
 *    instance) to buy nothing.
 *
 *  - `X-Content-Type-Options: nosniff`. Stops a browser second-guessing our
 *    declared `Content-Type`. Cheap, and it is what makes the frame/CSP headers
 *    below genuinely redundant rather than merely probably-redundant: a JSON
 *    response that can never be re-interpreted as HTML has no script to run and
 *    no document to frame.
 *
 *  Deliberately NOT set, because each governs a browser-rendered document and
 *  this API never returns one:
 *
 *  - `Content-Security-Policy`: constrains resource loading inside a document.
 *    There is no document, no script execution context, and no subresource.
 *  - `X-Frame-Options` / `frame-ancestors`: framing protections for a page. A
 *    JSON body cannot be usefully framed, and nosniff blocks the reinterpretation
 *    that would be needed to try.
 *  - `Referrer-Policy`: controls the `Referer` a browser attaches when
 *    navigating away from a rendered page. No page, no navigation.
 *  - `Cross-Origin-Opener-Policy` / `-Embedder-Policy` / `-Resource-Policy`:
 *    browsing-context and subresource isolation. Every route already requires a
 *    bearer token that no cross-origin browser context can obtain, and no CORS
 *    headers are served, so a browser cannot read a response regardless.
 *  - `Origin-Agent-Cluster`, `X-DNS-Prefetch-Control`: document-level browser
 *    hints. Inert.
 *  - `X-Permitted-Cross-Domain-Policies`: Adobe Flash / PDF `crossdomain.xml`
 *    legacy. The technology is dead.
 *  - `X-XSS-Protection`: helmet ships `0` to switch off the legacy auditor that
 *    was itself exploitable. Every current browser has removed the feature.
 *  - `X-Powered-By` removal: Fastify, unlike Express, never sets it.
 *
 *  If a browser-rendered surface is ever added (a web dashboard, an OAuth
 *  callback page, a marketing site on this origin), revisit this list as a whole
 *  rather than adding one header: at that point CSP and frame options stop being
 *  inert and helmet's defaults start earning their dependency. */
export function registerSecurityHeaders(app: FastifyInstance): void {
  app.addHook('onSend', async (_req, reply) => {
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    reply.header('X-Content-Type-Options', 'nosniff');
  });
}
