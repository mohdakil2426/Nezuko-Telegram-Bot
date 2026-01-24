# ============================================
# NEZUKO ADMIN WEB - PRODUCTION DOCKERFILE
# ============================================

# Base image
FROM oven/bun:1.1-alpine as base
WORKDIR /app

# 1. Install Dependencies
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

# Copy workspace config
COPY package.json pnpm-workspace.yaml turbo.json bun.lock ./

# Copy packages
COPY packages ./packages

# Copy app package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/api/package.json ./apps/api/package.json 
# ^ (Optional, just in case workspace complains about missing local packages)

# Install dependencies
RUN bun install --frozen-lockfile

# 2. Build
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED 1
ENV NODE_ENV production

# Build Next.js app
# Filter ensures we only build the web app
RUN bun run build --filter=@nezuko/web

# 3. Production Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
# The standalone folder will contain a minimal node_modules and the app code
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Start the optimized server
CMD ["bun", "apps/web/server.js"]
