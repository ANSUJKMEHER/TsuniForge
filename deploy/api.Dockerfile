# ============================================
# TsuniForge API — Production Dockerfile
# ============================================
# Multi-stage build for the NestJS monorepo API
# ============================================

# ─── Stage 1: Install Dependencies ──────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/common/package.json packages/common/package.json

# Install all dependencies (including dev for build)
RUN npm ci --workspace=@tsuniforge/api --workspace=@tsuniforge/common --include-workspace-root

# ─── Stage 2: Build ─────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/common/node_modules ./packages/common/node_modules 2>/dev/null || true

# Copy source code
COPY package.json package-lock.json ./
COPY packages/common ./packages/common
COPY apps/api ./apps/api

# Build the common package first, then the API
RUN cd packages/common && npx tsc --outDir dist || true
RUN cd apps/api && npx nest build

# ─── Stage 3: Production Runtime ────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy only what's needed for production
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules 2>/dev/null || true
COPY --from=builder /app/apps/api/package.json ./package.json

# Switch to non-root user
USER nestjs

# Expose API port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/docs || exit 1

# Start the API
CMD ["node", "dist/main.js"]
