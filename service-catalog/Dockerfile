# Multi-stage build for Service Catalog
FROM node:18-alpine AS builder

WORKDIR /app

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache python3 make g++ && \
    rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript (if build script exists)
RUN npm run build 2>/dev/null || echo "No build script found, using source directly"

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create non-root user with specific UID for Kubernetes compatibility
RUN addgroup -g 1000 -S nodejs && \
    adduser -S -u 1000 -G nodejs nodejs

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application or source code
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist 2>/dev/null || \
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/public ./public

# Create necessary directories with proper permissions for Kubernetes
RUN mkdir -p /app/.cache /tmp && \
    chown -R nodejs:nodejs /app /tmp && \
    chmod -R 755 /app

# Switch to non-root user
USER nodejs

# Health check optimized for Kubernetes
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8081/health || exit 1

# Expose port
EXPOSE 8081

# Use dumb-init to handle signals properly in Kubernetes
ENTRYPOINT ["dumb-init", "--"]

# Start command - try dist first, fallback to src
CMD ["sh", "-c", "node dist/index.js 2>/dev/null || node src/index.js"]
