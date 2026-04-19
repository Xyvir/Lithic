#!/bin/bash
set -euo pipefail

# ==============================================================================
# Lithic Server — Entrypoint
# Generates a Caddyfile from environment variables and boots Caddy.
# ==============================================================================

APP_DIR="/app"
PUBLIC_DIR="${APP_DIR}/public"
DATA_DIR="/data"
CADDYFILE="${APP_DIR}/Caddyfile"

# --- Environment Variables ---
LITHIC_USER="${LITHIC_USER:-admin}"
LITHIC_PASSWORD="${LITHIC_PASSWORD:-changeme}"
LITHIC_PORT="${PORT:-${LITHIC_PORT:-8080}}"

echo "============================================"
echo "  Lithic Server"
echo "============================================"
echo "  User:  ${LITHIC_USER}"
echo "  Port:  ${LITHIC_PORT}"
echo "  Data:  ${DATA_DIR}"
echo "============================================"

# --- Validate ---
if [ "${LITHIC_PASSWORD}" = "changeme" ]; then
  echo ""
  echo "  ⚠  WARNING: Using default password!"
  echo "  Set LITHIC_PASSWORD to secure your instance."
  echo ""
fi

# --- Ensure data directory and .gitignore exist ---
mkdir -p "${DATA_DIR}"
if [ ! -f "${DATA_DIR}/.gitignore" ]; then
  echo "*.lock" > "${DATA_DIR}/.gitignore"
fi

# --- Initialize Git if not present ---
if [ ! -d "${DATA_DIR}/.git" ]; then
  echo "Initializing Git repository in ${DATA_DIR}..."
  git -C "${DATA_DIR}" init
  git -C "${DATA_DIR}" config user.email "backup@lithic.uk"
  git -C "${DATA_DIR}" config user.name "Lithic Backup"
  # Initial commit if files exist
  if [ -n "$(ls -A "${DATA_DIR}" | grep -v .git)" ]; then
    git -C "${DATA_DIR}" add .
    git -C "${DATA_DIR}" commit -m "Initial Backup: $(date)" || true
  fi
fi

# --- Start Watcher ---
echo "Starting backup watcher..."
/app/watcher.sh &

# --- Hash the password ---
echo "Generating password hash..."
# Jane's Note: Passing plaintext passwords in CLI args can leak to process lists (`ps`).
# In a transient Docker container, we'll tolerate it, but keep it in mind.
HASHED_PASSWORD=$("${APP_DIR}/caddy" hash-password --plaintext "${LITHIC_PASSWORD}")
echo "Password hash generated."

# --- Write Caddyfile ---
echo "Writing Caddyfile..."
cat > "${CADDYFILE}" <<EOF
{
    auto_https off
    order webdav last
    order cgi last
}

:${LITHIC_PORT} {
    # 1. Protection Rules
    # Authenticate everything EXCEPT the PWA installation assets and healthcheck
    @protected {
        not path /manifest.json /site.webmanifest /offline-service-worker.js /android-chrome-* /apple-touch-icon.png /favicon* /health
    }

    basic_auth @protected {
        ${LITHIC_USER} ${HASHED_PASSWORD}
    }

    # 2. GitHub Backup API (CGI)
    handle /api/github/* {
        cgi * /app/scripts/github-backup.sh
    }

    # 3. WebDAV Sync
    handle /sync/* {
        uri strip_prefix /sync
        webdav {
            root ${DATA_DIR}
        }
    }

    # 4. Web Server 
    # Serves all public assets. If a request made it past basic_auth, it lands here.
    handle * {
        file_server {
            root ${PUBLIC_DIR}
        }
    }
}
EOF

echo "Caddyfile written to ${CADDYFILE}"
echo ""
echo "Starting Caddy..."
exec "${APP_DIR}/caddy" run --config "${CADDYFILE}"