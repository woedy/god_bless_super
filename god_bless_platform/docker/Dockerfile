# Development Dockerfile with security hardening
FROM node:18-alpine

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

WORKDIR /app

# Change ownership of the working directory
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Copy package files with proper ownership
COPY --chown=appuser:appgroup package*.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Copy source code with proper ownership
COPY --chown=appuser:appgroup . .

# Expose port
EXPOSE 5173

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5173 || exit 1

# Start development server with host binding for Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]