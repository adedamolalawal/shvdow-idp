#!/bin/bash

# Services that need multi-stage Docker builds for TypeScript
services=("team-management" "service-catalog" "metrics-collector" "alert-engine" "docs-engine" "cicd-engine")

for service in "${services[@]}"; do
    echo "Updating Dockerfile for $service..."
    
    # Get the port from the existing Dockerfile
    port=$(grep "EXPOSE" services/$service/Dockerfile | awk '{print $2}')
    
    # Create the new multi-stage Dockerfile
    cat > services/$service/Dockerfile << EOF
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE $port

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \\
  CMD wget --no-verbose --tries=1 --spider http://localhost:$port/health || exit 1

# Start the application
CMD ["npm", "start"]
EOF

    echo "Updated $service Dockerfile"
done

echo "All Dockerfiles updated!"

