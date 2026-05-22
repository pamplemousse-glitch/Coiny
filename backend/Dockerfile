# ── Stage 1: build ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
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

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

COPY pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

RUN pnpm install --frozen-lockfile --filter coiny-backend... --prod

COPY --from=builder /app/backend/dist ./backend/dist/
COPY backend/drizzle ./backend/drizzle/
COPY backend/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

# Drop root — node:alpine ships a non-root 'node' user (uid 1000).
# If an attacker achieves RCE, they get uid 1000, not root.
USER node

ENTRYPOINT ["./entrypoint.sh"]
