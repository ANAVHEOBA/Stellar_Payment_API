# ─────────────────────────────────────────────
#  Stage 1 – install production dependencies
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps

# Install OS-level build tools required by some native add-ons
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy only the manifests so Docker can cache this layer
COPY package.json package-lock.json ./

# Install ONLY production dependencies (skip devDependencies)
RUN npm ci --omit=dev

# ─────────────────────────────────────────────
#  Stage 2 – production image
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security best-practice: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copy installed production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY package.json ./

# Use non-root user from this point forward
USER appuser

EXPOSE 4000

# Health-check using the existing /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "src/index.js"]
