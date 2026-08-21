// The first thing the server imports, and it must stay that way.
//
// ESM evaluates imports in source order before any of the importing module's
// own body runs, so `import './observability/instrument.js'` at the top of
// server.ts initialises Sentry before Fastify, the database client or any
// vendor client is constructed.
//
// Sentry's ESM guide asks for `node --import ./instrument.mjs` instead. That
// exists so `import-in-the-middle` can patch modules for TRACING before they
// load. Tracing is off (`SENTRY_TRACES_SAMPLE_RATE` defaults to 0) and
// `registerEsmLoaderHooks: false` disables the hooks outright, so there is
// nothing left for the flag to buy. Keeping it out of `entrypoint.sh` keeps the
// boot path, which already had one subtle bug about Fly's release_command
// overriding CMD rather than ENTRYPOINT, as simple as it is now.
//
// If tracing is ever turned on, this stops being true and the `--import` flag
// becomes required.

import { initSentry } from './sentry.js';

initSentry();
