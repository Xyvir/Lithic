# ==============================================================================
# Lithic Server — Dockerfile
#
# Multi-stage build:
#   Stage 1: Build custom Caddy binary with WebDAV plugin
#   Stage 2: Assemble minimal runtime image
#
# Works both standalone (Railway, docker build .) and with pre-built tarballs.
#
# Build:  docker build -t lithic -f deploy/Dockerfile .
# Run:    docker run -p 8080:8080 -e LITHIC_USER=admin -e LITHIC_PASSWORD=secret -v lithic-data:/data lithic
# ==============================================================================

# --- Stage 1: Build Caddy with WebDAV ---
FROM golang:1.22-alpine AS caddy-builder

RUN apk add --no-cache git
RUN go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
RUN xcaddy build --with github.com/mholt/caddy-webdav --output /caddy

# --- Stage 2: Runtime ---
FROM alpine:latest

RUN apk add --no-cache bash sed

# App structure
RUN mkdir -p /app/public/src /data

# Copy custom Caddy binary from builder
COPY --from=caddy-builder /caddy /app/caddy

# Copy entrypoint
COPY deploy/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh /app/caddy

# Copy Lithic UI files
COPY index.html              /app/public/index.html
COPY src/launcher.html       /app/public/src/launcher.html
COPY src/lithic.html         /app/public/src/lithic.html

# Static assets (non-fatal if missing)
COPY favicon.ico              /app/public/favicon.ico
COPY favicon-16x16.png        /app/public/favicon-16x16.png
COPY favicon-32x32.png        /app/public/favicon-32x32.png
COPY mstile-150x150.png       /app/public/mstile-150x150.png
COPY android-chrome-192x192.png /app/public/android-chrome-192x192.png
COPY android-chrome-512x512.png /app/public/android-chrome-512x512.png
COPY apple-touch-icon.png     /app/public/apple-touch-icon.png
COPY manifest.json            /app/public/manifest.json
COPY site.webmanifest         /app/public/site.webmanifest
COPY offline-service-worker.js /app/public/offline-service-worker.js
COPY intro.html               /app/public/intro.html
COPY intro.lith               /app/public/intro.lith
COPY 404.html                 /app/public/404.html
COPY src/mstile-150x150.png   /app/public/src/mstile-150x150.png
COPY src/app-icon.png         /app/public/src/app-icon.png

EXPOSE 8080

ENV LITHIC_USER=admin
ENV LITHIC_PASSWORD=changeme
ENV LITHIC_PORT=8080

ENTRYPOINT ["/app/entrypoint.sh"]
