# syntax=docker/dockerfile:1
#
# R&D Academy — production image for container platforms (Saturn / Kubernetes / Docker).
#
# Build:  docker build -t rnd-academy:latest .
# Run:    docker run -p 3000:3000 --env-file .env -v rnd-uploads:/app/public/uploads rnd-academy:latest
#
# NOTE: uploaded media lives in /app/public/uploads — mount a persistent volume there
# or the files are lost on every restart. See SATURN_MIGRATION.md.

ARG NODE_VERSION=20-alpine

# ── Base ────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS base
# openssl + libc6-compat are required by the Prisma query engine on Alpine
RUN apk add --no-cache libc6-compat openssl
ENV NEXT_TELEMETRY_DISABLED=1

# ── Dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# prisma/schema.prisma is needed because `postinstall` runs `prisma generate`
COPY prisma ./prisma
RUN npm ci

# ── Build ───────────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js evaluates modules during the build; a syntactically valid placeholder
# DATABASE_URL keeps Prisma client construction happy. No database is contacted.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV NEXTAUTH_SECRET="build-time-placeholder-not-used-at-runtime"
ENV NODE_ENV=production
RUN npm run build

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# Port is NOT hardcoded: the platform (Coolify/Saturn, k8s) injects PORT and
# routes to it. Next.js standalone falls back to 3000 when PORT is unset, which
# matches the usual "Ports Exposes" default — so the image works out of the box
# and still honours whatever the platform sets.
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs \
 && adduser -S -u 1001 -G nodejs nextjs

# Static assets and the self-contained server bundle
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema + migrations + CLI, so the container can run `migrate deploy`
# itself in a closed network (no npx download at runtime).
#
# Do NOT copy node_modules/.bin/prisma: it is a symlink to ../prisma/build/index.js
# and Docker COPY dereferences symlinks, producing a detached copy that cannot
# find its sibling prisma_schema_build_bg.wasm. The entrypoint invokes the real
# path (node ./node_modules/prisma/build/index.js) instead.
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

# Persistent upload target — mount a volume here
RUN mkdir -p /app/public/uploads/media && chown -R nextjs:nodejs /app/public/uploads
VOLUME ["/app/public/uploads"]

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
CMD ["node", "server.js"]
