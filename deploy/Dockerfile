# ==============================================================================
# Lithic Server — Dockerfile
#
# Thin image that extracts the pre-built "God Artifact" tarball.
# Build with:  docker build -t lithic .
# Run with:    docker run -p 8080:8080 -e LITHIC_USER=admin -e LITHIC_PASSWORD=secret -v lithic-data:/data lithic
# ==============================================================================

FROM alpine:latest

# Install bash (required by entrypoint.sh)
RUN apk add --no-cache bash

# Pull and extract the God Artifact from GitHub Releases
# For local builds, copy the tarball instead:
#   COPY lithic-server.tar.gz /tmp/lithic-server.tar.gz
ADD https://github.com/Xyvir/Lithic-UK/releases/latest/download/lithic-server.tar.gz /tmp/lithic-server.tar.gz
RUN tar -xzf /tmp/lithic-server.tar.gz -C / && rm /tmp/lithic-server.tar.gz

# Ensure entrypoint is executable
RUN chmod +x /app/entrypoint.sh /app/caddy

# Create persistent data directory
RUN mkdir -p /data

EXPOSE 8080

VOLUME ["/data"]

ENTRYPOINT ["/app/entrypoint.sh"]
