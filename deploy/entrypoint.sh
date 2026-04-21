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
  git -C "${DATA_DIR}" branch -M main > /dev/null 2>&1

  # Ensure .gitignore is the VERY first thing committed to set the rules
  if [ ! -f "${DATA_DIR}/.gitignore" ]; then
    echo "*.lock" > "${DATA_DIR}/.gitignore"
  fi
  git -C "${DATA_DIR}" add .gitignore >/dev/null 2>&1
  git -C "${DATA_DIR}" commit -m "System: Initialize .gitignore" >/dev/null 2>&1

  # Initial commit if files exist (will now strictly follow .gitignore)
  if ! git -C "${DATA_DIR}" rev-parse HEAD >/dev/null 2>&1; then
      git -C "${DATA_DIR}" add .
      git -C "${DATA_DIR}" commit -m "Initial Backup: $(date)" >/dev/null 2>&1
  fi
fi

# --- Purge Orphaned / Stale Lock Files ---
echo "Scanning for orphaned and stale lock files..."
orphaned=0
stale=0
now_epoch=$(date +%s)
lock_max_age_seconds=120  # 2 minutes — heartbeat is every 30s, so anything older is dead

while IFS= read -r lockfile; do
  # Derive the corresponding .lith path (strip trailing .lock)
  lithfile="${lockfile%.lock}"

  # Case 1: Orphaned — no matching .lith file
  if [ ! -f "${lithfile}" ]; then
    echo "  Removing orphaned lock (no matching .lith): ${lockfile}"
    rm -f "${lockfile}"
    orphaned=$((orphaned + 1))
    continue
  fi

  # Case 2: Stale — lock file's mtime is older than the heartbeat window
  file_mtime=$(stat -c %Y "${lockfile}" 2>/dev/null || echo 0)
  age=$(( now_epoch - file_mtime ))
  if [ "${age}" -gt "${lock_max_age_seconds}" ]; then
    echo "  Removing stale lock (age=${age}s): ${lockfile}"
    rm -f "${lockfile}"
    stale=$((stale + 1))
  fi
done < <(find "${DATA_DIR}" -maxdepth 1 -name "*.lock" -type f 2>/dev/null)

echo "  Purge complete: ${orphaned} orphaned, ${stale} stale lock(s) removed."

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
        # Ensure .lith files are served with explicit UTF-8 encoding
        # so clients (e.g. VS Code WebDAV) decode the triple-asterism ⁂ correctly.
        @lithFiles path *.lith
        header @lithFiles Content-Type "text/plain; charset=utf-8"

        webdav {
            root ${DATA_DIR}
            prefix /sync
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