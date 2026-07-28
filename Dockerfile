# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:26-alpine AS builder

WORKDIR /app

# Install dependencies first (separate layer so it is cached unless
# package.json / package-lock.json change).
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build.
COPY . .
RUN npm run build


# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:26-alpine

# Non-root user for least-privilege operation.
RUN addgroup -S habits && adduser -S -G habits habits

WORKDIR /app

# Only the self-contained build output is needed at runtime; adapter-node
# bundles all server-side code so there are no node_modules to copy.
COPY --from=builder /app/build ./build

# Persist the SQLite database outside the container image.
# Mount a host directory or named volume here to survive container restarts.
RUN mkdir -p /data && chown habits:habits /data

USER habits

# adapter-node reads HOST / PORT / ORIGIN from the environment.
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATABASE_PATH=/data/habits.db

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

ENTRYPOINT ["node", "build/index.js"]
