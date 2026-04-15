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

# --- Ensure data directory exists ---
mkdir -p "${DATA_DIR}"

# --- Hash the password ---
echo "Generating password hash..."
HASHED_PASSWORD=$("${APP_DIR}/caddy" hash-password --plaintext "${LITHIC_PASSWORD}")
echo "Password hash generated."

# --- Write Caddyfile ---
echo "Writing Caddyfile..."
cat > "${CADDYFILE}" <<EOF
{
	auto_https off
}

:${LITHIC_PORT} {
	# 1. Public Assets (Health & PWA)
	handle /health {
		@noStorage not file {
			root /
		} /data/
		respond @noStorage "Storage Mount Failure" 500
		respond "OK" 200
	}

	# PWA support: manifest, icons, and service worker must be public for browsers to install correctly
	handle /manifest.json { file_server { root ${PUBLIC_DIR} } }
	handle /site.webmanifest { file_server { root ${PUBLIC_DIR} } }
	handle /offline-service-worker.js { file_server { root ${PUBLIC_DIR} } }
	handle /android-chrome-* { file_server { root ${PUBLIC_DIR} } }
	handle /apple-touch-icon.png { file_server { root ${PUBLIC_DIR} } }
	handle /favicon* { file_server { root ${PUBLIC_DIR} } }

	# 2. Private WebDAV Syncd UI
	basicauth * {
		${LITHIC_USER} ${HASHED_PASSWORD}
	}

	route /sync/* {
		uri strip_prefix /sync
		webdav {
			root ${DATA_DIR}
		}
	}

	route * {
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
