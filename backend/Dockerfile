# Node 26 here, in CI, and in .nvmrc, all deliberately the same version.
#
# They were three different versions: 26 locally, 22 in CI, 22 in this image.
# That is how twenty tests passed on a laptop and failed on a runner while
# making real network calls to Plaid: MockAgent installs a dispatcher through
# the npm `undici` package, and whether Node's built-in `fetch` honours it
# depends on the bundled undici matching the packaged one. On 26 it matches; on
# 22 it does not, silently, and the mocked requests go out to the real internet.
#
# Chasing that interop was the wrong fix. Testing a different runtime from the
# one that ships is the defect. If this version moves, move all four together:
# .nvmrc, backend/package.json engines, every workflow's node-version, and here.
#
# Three stages, so that neither pnpm nor any build tooling survives into the
# image that actually runs. The entrypoint execs `node` directly, so pnpm is
# only ever needed to resolve and install, never at runtime. Leaving it in the
# final layer previously shipped pnpm's own CVEs (7 at last scan, 2 CRITICAL)
# inside a service that never invokes it.

# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:26-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

# Workspace manifests + lockfile first for layer cache
COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

RUN pnpm install --frozen-lockfile --filter coiny-backend...

COPY backend/tsconfig.json backend/tsconfig.build.json ./backend/
COPY backend/src ./backend/src/

RUN pnpm --filter coiny-backend build

# ── Stage 2: production dependencies ─────────────────────────────────────────
# Resolved in isolation so the runtime stage can copy the tree without ever
# installing a package manager of its own.
FROM node:26-alpine AS deps
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

# --node-linker=hoisted produces a flat node_modules of real directories rather
# than pnpm's default content-addressed store plus symlinks. Symlinked trees do
# not survive a COPY --from cleanly (the links point at paths that may not be
# reproduced), and a dangling link would only show up at container start, after
# a merge has already auto-deployed. Flat costs some disk and removes that class
# of failure entirely.
RUN pnpm install --frozen-lockfile --filter coiny-backend... --prod --node-linker=hoisted

# ── Stage 3: runtime ─────────────────────────────────────────────────────────
# No corepack, no pnpm, no compilers. Just node, the resolved dependency tree,
# and compiled output.
FROM node:26-alpine AS runtime
WORKDIR /app

# node:22-alpine bundles npm, which the entrypoint never invokes and which
# carries its own transitive advisories (brace-expansion, ip-address, sigstore,
# tar at last scan). Removing it drops those findings and shrinks the attack
# surface of a container whose only job is to exec one node process.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

COPY --from=deps /app/node_modules ./node_modules

COPY backend/package.json ./backend/
COPY --from=builder /app/backend/dist ./backend/dist/
COPY backend/drizzle ./backend/drizzle/
COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

# Drop root, node:alpine ships a non-root 'node' user (uid 1000).
# If an attacker achieves RCE, they get uid 1000, not root.
USER node

ENTRYPOINT ["./entrypoint.sh"]
