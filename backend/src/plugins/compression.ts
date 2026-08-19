import { promisify } from 'node:util';
import { gzip } from 'node:zlib';
import type { FastifyInstance } from 'fastify';

const gzipAsync = promisify(gzip);

/** Below this, gzip is not worth doing. A short JSON body often comes out
 *  LARGER than it went in once the gzip header, footer and CRC are added, and
 *  even when it shrinks it saves fewer bytes than a single TCP segment. 1 KiB
 *  is the threshold `@fastify/compress` uses by default, kept here so the
 *  behaviour matches what a reader expects from the usual plugin. */
export const MIN_COMPRESS_BYTES = 1024;

/** Response compression for a JSON API (audit 4.6.2).
 *
 *  WHY NOT `@fastify/compress`: audit 4.6.2 called this "the one place a new
 *  dependency is clearly worth its supply-chain cost" and then offered the
 *  alternative in the same sentence, and 4.13.7 settled it: `node:zlib` is a
 *  built-in, so the whole of Part 4 adds no vendor at all. Seven production
 *  dependencies is, per §1.9.12, "the single most valuable supply-chain
 *  property this repository has", and `.claude/rules/security.md` rule 7 asks
 *  for a built-in wherever one suffices. One does.
 *
 *  What this is worth, measured in 4.6.1 and 4.6.2 on the real
 *  `NetWorthResponse` shape rather than on a guess: an empty user's payload
 *  goes 2,898 B to 545 B, a typical tester's 5,932 B to 901 B, and a heavy
 *  user's 15,396 B to 1,163 B. That is 5.3x to 13.2x. Fly's proxy does not
 *  compress on the app's behalf, and `URLSession` already sends
 *  `Accept-Encoding: gzip` on every request, so the client half has been in
 *  place the whole time and has had nothing to decode.
 *
 *  Deliberately gzip only, not Brotli. Brotli beats gzip by roughly another
 *  15% on JSON this size and costs noticeably more CPU at the default quality,
 *  and the only two clients are `URLSession` and OkHttp, both of which
 *  advertise gzip. Nothing would negotiate `br` today, so it would be an
 *  untested branch.
 *
 *  Async rather than `gzipSync`: these run on the same thread that serves every
 *  other request, and the sync call would hold the event loop for the whole
 *  compression. At 15 KB that is short, but it scales with payload size and
 *  concurrency, and the async form costs one `await`. */
export function registerCompression(app: FastifyInstance): void {
  app.addHook('onSend', async (req, reply, payload) => {
    // Streams and null bodies are passed straight through. Buffering a stream
    // here to compress it would defeat the reason it is a stream.
    if (typeof payload !== 'string' && !Buffer.isBuffer(payload)) return payload;

    // Something upstream already encoded this. Compressing twice produces a
    // body no client can read.
    if (reply.getHeader('content-encoding') !== undefined) return payload;

    // Set on every response, including the ones left uncompressed. The same URL
    // answers with different bytes depending on this request header, and a
    // shared cache that did not know it could hand gzip bytes to a client that
    // never asked for them.
    reply.header('Vary', 'Accept-Encoding');

    if (!acceptsGzip(req.headers['accept-encoding'])) return payload;
    if (!isCompressible(String(reply.getHeader('content-type') ?? ''))) return payload;

    const raw = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');
    if (raw.byteLength < MIN_COMPRESS_BYTES) return payload;

    const compressed = await gzipAsync(raw);

    // Content-Length was computed from the uncompressed body before this hook
    // ran. Leaving it stale is not a cosmetic error: the client reads exactly
    // that many bytes and then either hangs waiting for more or truncates the
    // body mid-stream.
    reply.header('Content-Encoding', 'gzip');
    reply.header('Content-Length', compressed.byteLength);
    return compressed;
  });
}

/** RFC 9110 §12.5.3. `gzip;q=0` is an explicit refusal, not a request, and a
 *  bare `*` accepts anything we care to send. Both matter: a client that says
 *  `gzip;q=0` and gets gzip back cannot read the response at all. */
function acceptsGzip(header: string | string[] | undefined): boolean {
  if (header === undefined) return false;
  const value = Array.isArray(header) ? header.join(',') : header;

  for (const part of value.split(',')) {
    const [coding, ...params] = part.trim().split(';');
    const name = coding?.trim().toLowerCase();
    if (name !== 'gzip' && name !== '*') continue;

    const quality = params.map((p) => p.trim().toLowerCase()).find((p) => p.startsWith('q='));
    if (quality !== undefined && Number.parseFloat(quality.slice(2)) === 0) continue;

    return true;
  }

  return false;
}

/** Text compresses; already-compressed bytes do not. This API serves JSON and,
 *  on exactly one route, the plain-text `security.txt`. An allowlist rather
 *  than a denylist so that a future route serving an image or a PDF does not
 *  silently start spending CPU to make its payload marginally bigger. */
function isCompressible(contentType: string): boolean {
  const type = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (type.startsWith('text/')) return true;
  return type === 'application/json' || type.endsWith('+json');
}
