# ─────────────────────────────────────────────
# Stage 1: Install + Build with Bun
# ─────────────────────────────────────────────
# Bun resolves deps AND runs tsc (bun x tsc -p tsconfig.build.json).
# This matches the canonical quality-gate build command exactly.
FROM oven/bun:1.2 AS builder
WORKDIR /app

# Install deps first (layer cache: only re-runs when lockfile changes)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy full source and run the TypeScript build
COPY . .
RUN bun run build

# ─────────────────────────────────────────────
# Stage 2: Production runtime (Node.js 22-slim)
# ─────────────────────────────────────────────
FROM node:22-slim AS runner

# Non-root user — prevents root escalation if the bot process is compromised.
RUN addgroup --system --gid 1001 botgroup && \
    adduser --system --uid 1001 --ingroup botgroup botuser

WORKDIR /app

ENV NODE_ENV=production

# Copy only what's needed at runtime — never src or devDependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER botuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
