# Syntax version indicating use of Docker BuildKit features
# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# Stage 1: Base
# Define a common base image to ensure consistency across stages
# -----------------------------------------------------------------------------
FROM node:22-alpine AS base

# Install libc6-compat if needed for specific native modules (like sharp/Astro Image) available on Alpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 2: Production Dependencies
# Install only production dependencies to keep the final image small
# -----------------------------------------------------------------------------
FROM base AS prod-deps
COPY package.json package-lock.json ./
# Install only production deps, ignoring scripts (like husky) that might fail without devDeps
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 3: Build
# Install all dependencies and build the application
# -----------------------------------------------------------------------------
FROM base AS build
COPY package.json package-lock.json ./
# Install full dependencies (including dev) for the build process
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the Astro application (outputs to /dist)
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 4: Runtime
# The final executable image
# -----------------------------------------------------------------------------
FROM base AS runtime

# Set environment to production
ENV NODE_ENV=production
# Configure Astro Node adapter to bind to all interfaces
ENV HOST=0.0.0.0
# Default port to 3000, can be overridden via -e PORT=xxxx
ENV PORT=3000

WORKDIR /app

# Switch to non-root user 'node' for security
USER node

# Copy production dependencies from prod-deps stage
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules

# Copy built artifacts from build stage
# Astro Standalone output is usually in dist/
COPY --chown=node:node --from=build /app/dist ./dist

# Expose the default port (documentation only)
EXPOSE 3000

# Healthcheck to ensure container is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/ || exit 1

# Start the standalone Node server
# Note: Astro Node adapter 'standalone' mode produces an entry file at dist/server/entry.mjs
# Use shell form to allow environment variable expansion
CMD node ./dist/server/entry.mjs
