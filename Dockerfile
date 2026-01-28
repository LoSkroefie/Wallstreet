# Wallstreet Platform - Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    postgresql-client \
    curl

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S wallstreet && \
    adduser -S wallstreet -u 1001

# Create necessary directories
RUN mkdir -p logs monitoring/logs && \
    chown -R wallstreet:wallstreet /app

# Switch to non-root user
USER wallstreet

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start application
CMD ["node", "api/gateway/server.js"]
