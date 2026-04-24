#!/bin/bash
# ==============================================================================
# Lithic Sync Watcher
# Monitors /data for changes and performs bidirectional sync with GitHub.
# Specialized Conflict Resolution: GitHub is the Source of Truth.
# ==============================================================================

DATA_DIR="/data"
LOCK_FILE="/tmp/github-sync.lock"

echo "[Watcher] Starting inotifywait on ${DATA_DIR}..."

# Wait for git to be initialized and remote to be added
while [ ! -d "${DATA_DIR}/.git" ] || ! git -C "${DATA_DIR}" remote get-url origin >/dev/null 2>&1; do
    sleep 5
done

echo "[Watcher] Git repository detected with origin. Monitoring for changes..."

sync_now() {
    # Avoid concurrent syncs
    if [ -f "$LOCK_FILE" ]; then
        # Check if lock is stale (older than 5 mins)
        if [ "$(( $(date +%s) - $(stat -c %Y "$LOCK_FILE") ))" -gt 300 ]; then
            echo "[Watcher] Removing stale lock file..."
            rm -f "$LOCK_FILE"
        else
            return
        fi
    fi
    touch "$LOCK_FILE"

    # Check if we have a token (indicates we are connected)
    if [ ! -f "${DATA_DIR}/.git/backup_token" ]; then
        rm -f "$LOCK_FILE"
        return
    fi

    # Pull latest token and repo info
    TOKEN=$(cat "${DATA_DIR}/.git/backup_token")
    REPO_URL=$(git -C "${DATA_DIR}" remote get-url origin)
    REPO_NAME=$(echo "$REPO_URL" | sed -E 's|.*/([^/]+/[^/]+)\.git$|\1|')
    
    # Update remote URL with latest token
    git -C "${DATA_DIR}" remote set-url origin "https://oauth2:${TOKEN}@github.com/${REPO_NAME}.git"

    echo "[Watcher] Checking for updates..."
    git -C "${DATA_DIR}" fetch origin main >/dev/null 2>&1
    
    REMOTE_HASH=$(git -C "${DATA_DIR}" rev-parse origin/main 2>/dev/null)
    LOCAL_HASH=$(git -C "${DATA_DIR}" rev-parse HEAD 2>/dev/null)

    # 1. Stage local changes
    git -C "${DATA_DIR}" add .
    HAS_LOCAL_CHANGES=false
    if ! git -C "${DATA_DIR}" diff --cached --quiet; then
        HAS_LOCAL_CHANGES=true
    fi

    # 2. Conflict Detection & Resolution Procedure
    # Conflict = Remote has changes that are not in our local history
    if [ -n "$REMOTE_HASH" ] && ! git -C "${DATA_DIR}" merge-base --is-ancestor "$REMOTE_HASH" HEAD; then
        echo "[Watcher] Conflict detected (Source of Truth has diverged)."
        echo "[Watcher] Procedure: Backup Local -> Push -> Clobber Upstream -> Push Final."

        # a. Commit local state as a conflict backup
        if [ "$HAS_LOCAL_CHANGES" = true ]; then
            git -C "${DATA_DIR}" commit -m "CONFLICT BACKUP: Local state at $(date +'%Y-%m-%d %H:%M:%S')"
        else
            # Even if no uncommitted changes, the branch has diverged, so we label the current HEAD
            git -C "${DATA_DIR}" commit --allow-empty -m "CONFLICT BACKUP: Diverged local state at $(date +'%Y-%m-%d %H:%M:%S')"
        fi

        # b. Force push the local version to GitHub (preserves it in history)
        echo "[Watcher] Force pushing local version as backup..."
        git -C "${DATA_DIR}" push -f origin main

        # c. Restore upstream changes and clobber on top
        echo "[Watcher] Clobbering with upstream changes (Source of Truth)..."
        git -C "${DATA_DIR}" checkout "$REMOTE_HASH" -- .
        
        # d. Commit the clobbering sync
        git -C "${DATA_DIR}" commit -m "Automated Sync: GitHub Clobber (Source of Truth applied)"
        
        # e. Push the new version back up
        git -C "${DATA_DIR}" push origin main
        
        echo "[Watcher] Conflict resolved and synchronized."
    else
        # 3. Normal Sync Path (No conflict)
        if [ "$HAS_LOCAL_CHANGES" = true ]; then
            echo "[Watcher] Committing local changes..."
            git -C "${DATA_DIR}" commit -m "Automated Sync: $(date +'%Y-%m-%d %H:%M:%S')"
            echo "[Watcher] Pushing to GitHub..."
            git -C "${DATA_DIR}" push origin main
        fi

        # If remote is ahead but it's a clean fast-forward (or we were behind)
        if [ -n "$REMOTE_HASH" ] && ! git -C "${DATA_DIR}" merge-base --is-ancestor HEAD "$REMOTE_HASH"; then
            echo "[Watcher] Pulling remote updates..."
            git -C "${DATA_DIR}" pull --rebase origin main
        fi
    fi

    if [ $? -eq 0 ]; then
        echo "[Watcher] Sync successful: $(date)"
        echo "last_sync=$(date +%s)" > "${DATA_DIR}/.git/backup_status"
    else
        echo "[Watcher] Sync failed!"
        echo "error=$(date +%s)" > "${DATA_DIR}/.git/backup_status"
    fi

    rm -f "$LOCK_FILE"
}

# --- Background Polling Loop ---
(
    while true; do
        sleep 60
        sync_now
    done
) &

# --- Main Inotify Loop ---
inotifywait -m -e close_write "${DATA_DIR}" | while read path action file; do
    if [[ "$file" == *.lith ]] || [[ "$file" == *.json ]]; then
        # Skip if it's a lock file or hidden file
        if [[ "$file" == .* ]]; then continue; fi
        
        echo "[Watcher] Change detected in ${file}."
        sleep 2 # Debounce
        sync_now
    fi
done
