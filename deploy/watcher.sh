#!/bin/bash
# ==============================================================================
# Lithic Backup Watcher
# Monitors /data for changes to *.lith files and force-pushes to GitHub.
# ==============================================================================

DATA_DIR="/data"

echo "[Watcher] Starting inotifywait on ${DATA_DIR}..."

# Wait for git to be initialized and remote to be added
while [ ! -d "${DATA_DIR}/.git" ] || ! git -C "${DATA_DIR}" remote get-url origin >/dev/null 2>&1; do
    sleep 5
done

echo "[Watcher] Git repository detected with origin. Monitoring for changes..."

inotifywait -m -e close_write "${DATA_DIR}" | while read path action file; do
    if [[ "$file" == *.lith ]]; then
        # Check if we have a token (indicates we are connected)
        if [ ! -f "${DATA_DIR}/.git/backup_token" ]; then
            continue
        fi

        echo "[Watcher] Change detected in ${file}. Preparing backup..."
        sleep 1 # Debounce to prevent rapid-fire commits

        git -C "${DATA_DIR}" add "$file"
        git -C "${DATA_DIR}" commit -m "Automated Backup: $(date +'%Y-%m-%d %H:%M:%S')"
        
        # Pull latest token from file in case it changed
        TOKEN=$(cat "${DATA_DIR}/.git/backup_token")
        REPO_NAME=$(git -C "${DATA_DIR}" remote get-url origin | sed -E 's|.*/([^/]+/[^/]+)\.git$|\1|')
        
        # Update remote with latest token just in case
        git -C "${DATA_DIR}" remote set-url origin "https://oauth2:${TOKEN}@github.com/${REPO_NAME}.git"
        
        echo "[Watcher] Pushing to GitHub..."
        git -C "${DATA_DIR}" push -f origin main
        
        if [ $? -eq 0 ]; then
            echo "[Watcher] Backup successful: $(date)"
            # Create a status file for the frontend to read
            echo "last_sync=$(date +%s)" > "${DATA_DIR}/.git/backup_status"
        else
            echo "[Watcher] Backup failed!"
            echo "error=$(date +%s)" > "${DATA_DIR}/.git/backup_status"
        fi
    fi
done
