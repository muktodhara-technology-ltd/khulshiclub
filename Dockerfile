# ─── Build stage ──────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS build
WORKDIR /app

COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# ─── Runtime stage — Next.js standalone server ────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=1111
ENV HOSTNAME=0.0.0.0

# Standalone output includes a minimal server + traced deps
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# Writes /app/public/config.js (API_URL, PORTAL_DOMAIN) from env at every start
COPY --chmod=755 docker/40-app-config.sh /app/docker-entrypoint.sh

EXPOSE 1111

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:1111/healthz || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
