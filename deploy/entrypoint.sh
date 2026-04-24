#!/bin/bash
set -euo pipefail

# ==============================================================================
# Lithic Server — Entrypoint
# Generates a lighttpd.conf from environment variables and boots lighttpd.
# ==============================================================================
APP_DIR="/app"
PUBLIC_DIR="${APP_DIR}/public"
DATA_DIR="/data"
LIGHTTPD_CONF="${APP_DIR}/lighttpd.conf"

# --- Environment Variables ---
LITHIC_USER="${LITHIC_USER:-admin}"
LITHIC_PASSWORD="${LITHIC_PASSWORD:-changeme}"
LITHIC_PORT="${PORT:-${LITHIC_PORT:-8080}}"

echo "============================================"
echo "  Lithic Server (lighttpd)"
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
  printf "*.lock\nwebdav.db\n" > "${DATA_DIR}/.gitignore"
fi


# --- Initialize Git if not present ---
if [ ! -d "${DATA_DIR}/.git" ]; then
  echo "Initializing Git repository in ${DATA_DIR}..."
  git -C "${DATA_DIR}" init
  git -C "${DATA_DIR}" config user.email "sync@lithic.uk"
  git -C "${DATA_DIR}" config user.name "Lithic Sync"
  git -C "${DATA_DIR}" branch -M main > /dev/null 2>&1

  # Ensure .gitignore is the VERY first thing committed to set the rules
  if [ ! -f "${DATA_DIR}/.gitignore" ]; then
    printf "*.lock\nwebdav.db\n" > "${DATA_DIR}/.gitignore"
  fi
  git -C "${DATA_DIR}" add .gitignore >/dev/null 2>&1
  git -C "${DATA_DIR}" commit -m "System: Initialize .gitignore" >/dev/null 2>&1

  # Initial commit if files exist (will now strictly follow .gitignore)
  if ! git -C "${DATA_DIR}" rev-parse HEAD >/dev/null 2>&1; then
      git -C "${DATA_DIR}" add .
      git -C "${DATA_DIR}" commit -m "Initial Sync: $(date)" >/dev/null 2>&1
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
echo "Starting sync watcher..."
/app/watcher.sh &

# --- Generate Auth File ---
echo "Generating auth file..."
echo "${LITHIC_USER}:${LITHIC_PASSWORD}" > "${APP_DIR}/lighttpd.user"

# --- Write lighttpd.conf ---
echo "Writing lighttpd.conf..."
cat > "${LIGHTTPD_CONF}" <<EOF
server.modules = (
    "mod_access",
    "mod_alias",
    "mod_auth",
    "mod_authn_file",
    "mod_cgi",
    "mod_webdav",
    "mod_setenv"
)

server.document-root = "${PUBLIC_DIR}"
server.port = ${LITHIC_PORT}
server.bind = "0.0.0.0"

index-file.names = ( "index.html" )

mimetype.assign = (
    ".html" => "text/html",
    ".js" => "application/javascript",
    ".css" => "text/css",
    ".png" => "image/png",
    ".jpg" => "image/jpeg",
    ".gif" => "image/gif",
    ".svg" => "image/svg+xml",
    ".ico" => "image/x-icon",
    ".json" => "application/json",
    ".lith" => "text/plain; charset=utf-8",
    "" => "application/octet-stream"
)

auth.backend = "plain"
auth.backend.plain.userfile = "${APP_DIR}/lighttpd.user"

auth.require = (
    "/" => (
        "method" => "basic",
        "realm" => "Lithic",
        "require" => "valid-user"
    )
)

# Exempt public assets from auth
\$HTTP["url"] =~ "^/(manifest\\.json|site\\.webmanifest|offline-service-worker\\.js|android-chrome-.*|apple-touch-icon\\.png|favicon.*|health)" {
    auth.require = ()
}

# CGI for GitHub Sync
alias.url += ( "/api/github/" => "/app/scripts/github-sync.sh" )
\$HTTP["url"] =~ "^/api/github/" {
    cgi.assign = ( "" => "" )
    setenv.add-environment = ( "DATA_DIR" => "${DATA_DIR}" )
}

# WebDAV for Sync
alias.url += ( "/sync/" => "${DATA_DIR}/" )
\$HTTP["url"] =~ "^/sync/" {
    webdav.activate = "enable"
    webdav.is-readonly = "disable"
    webdav.sqlite-db-name = "${DATA_DIR}/webdav.db"
}
EOF

echo "lighttpd.conf written to ${LIGHTTPD_CONF}"
echo ""
echo "Starting lighttpd..."
exec lighttpd -D -f "${LIGHTTPD_CONF}"