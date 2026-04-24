# ==============================================================================
# Lithic Server — Dockerfile (Fast Static Binary Deployment)
# ==============================================================================

FROM alpine:latest

# Basic dependencies
RUN apk add --no-cache \
    bash \
    curl \
    ca-certificates \
    git \
    inotify-tools

# App structure
RUN mkdir -p /app/public/src /app/scripts /data

# Acquisition Strategy:
# 1. Attempt to download the latest pre-compiled God Artifact (contains static lighttpd + UI)
# 2. If it fails (e.g. no releases yet), the local files copied below will be used.
RUN curl -fsSL "https://github.com/Xyvir/Lithic/releases/latest/download/lithic-server.tar.gz" | tar -xz -C / 2>/dev/null || echo "No remote release found, using local files"

# Copy local files (overrides/fallbacks)
COPY deploy/entrypoint.sh /app/entrypoint.sh
COPY deploy/watcher.sh /app/watcher.sh
COPY deploy/github-sync.sh /app/scripts/github-sync.sh
RUN chmod +x /app/entrypoint.sh /app/watcher.sh /app/scripts/github-sync.sh

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
