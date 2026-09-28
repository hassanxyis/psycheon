# syntax=docker/dockerfile:1
###############################################################################
# Psychéon — production image (deploys on Render as a Docker web service)
#
# Strategy: build with `output: "standalone"` (see next.config.ts) so the final
# image ships only the traced runtime files from `.next/standalone` rather than
# the full `node_modules`. Multi-stage build: deps -> builder -> runner.
#
# Environment variables
# ---------------------
# NEXT_PUBLIC_* values are inlined into the client bundle at build time. On
# Render, service environment variables are translated automatically into
# Docker build args (see https://render.com/docs/docker), so the variables set
# on the Render service become available in the builder stage with no extra
# wiring. When building locally, pass them explicitly:
#
#   docker build \
#     --build-arg NEXT_PUBLIC_SITE_URL=https://psycheon.onrender.com \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co \
#     --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key \
#     -t psycheon .
###############################################################################

########################
# Stage 1 — dependencies
########################
FROM node:22-alpine AS deps
WORKDIR /app

# --frozen-lockfile installs exactly what package-lock.json pins.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --frozen-lockfile

########################
# Stage 2 — builder
########################
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time (public) values. The Supabase publishable/"anon" key is designed
# to be shipped to the browser (RLS protects the data), so it is safe to embed
# in an image. Never add secrets here.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# node_modules comes from the deps stage. Dev tooling (Tailwind, TypeScript,
# PostCSS) lives in devDependencies and is needed to run `next build`.
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

########################
# Stage 3 — runner (minimal, non-root)
########################
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0

# Run as a non-root user (nextjs uid/gid 1001).
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Public assets (icons, brand images). The standalone server serves these.
COPY --from=builder /app/public ./public

# Pre-create the (read-only) Next cache dir so the non-root user can own it.
RUN mkdir .next && chown nextjs:nodejs .next

# Traced server + node_modules + server.js make up the standalone build.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Generated JS/CSS chunks (and self-hosted fonts) served by the standalone server.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Render injects PORT at runtime (default 10000) and routes traffic to it;
# HOSTNAME is set above so the server binds to the container's interface.
EXPOSE 10000

CMD ["node", "server.js"]
