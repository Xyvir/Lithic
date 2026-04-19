#!/bin/bash
# ==============================================================================
# Lithic GitHub Backup — API Handler (CGI) V3
# Handles OAuth Device Flow, Repo Listing, and Git Initialization
# ==============================================================================

# CGI Headers
echo "Content-Type: application/json"
echo ""

DATA_DIR="/data"
DEFAULT_CLIENT_ID="Iv23lippjEJMp4KLlLKI"

# Diagnostic logging to stderr (visible in Railway/Docker logs)
echo "[CGI] Request: $REQUEST_METHOD $REQUEST_URI" >&2

CLIENT_ID="${GITHUB_CLIENT_ID:-$DEFAULT_CLIENT_ID}"
REQUEST_URI="${REQUEST_URI:-}"
METHOD="${REQUEST_METHOD:-GET}"

# Helper: Extract value from JSON-like strings
extract_json_val() {
    local key=$1
    local input=$2
    echo "$input" | sed -n "s/.*\"$key\":\"\([^\"]*\)\".*/\1/p"
}

# Simple Routing
if [[ "$REQUEST_URI" == */device-code* ]]; then
    RESPONSE=$(curl -s -X POST https://github.com/login/device/code \
        -H "Accept: application/json" \
        -d "client_id=${CLIENT_ID}&scope=repo")
    if [ $? -ne 0 ] || [ -z "$RESPONSE" ]; then
        echo '{"error":"network_error","error_description":"Failed to reach GitHub."}'
    else
        echo "$RESPONSE"
    fi

elif [[ "$REQUEST_URI" == */poll* ]]; then
    DEVICE_CODE=$(echo "$QUERY_STRING" | sed -n 's/.*device_code=\([^&]*\).*/\1/p')
    RESPONSE=$(curl -s -X POST https://github.com/login/oauth/access_token \
        -H "Accept: application/json" \
        -d "client_id=${CLIENT_ID}&device_code=${DEVICE_CODE}&grant_type=urn:ietf:params:oauth:grant-type:device_code")
    echo "$RESPONSE"

elif [[ "$REQUEST_URI" == */list-repos* ]]; then
    TOKEN=$(echo "$QUERY_STRING" | sed -n 's/.*token=\([^&]*\).*/\1/p')
    if [ -z "$TOKEN" ]; then
        echo '{"error":"missing_token"}'
        exit 0
    fi
    # Fetch user repositories (type=owner to prevent listing every public repo they contributed to)
    RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/user/repos?type=owner&sort=updated&per_page=100")
    echo "$RESPONSE"

elif [[ "$REQUEST_URI" == */create-repo* ]] && [[ "$METHOD" == "POST" ]]; then
    read -r PAYLOAD
    TOKEN=$(extract_json_val "token" "$PAYLOAD")
    RAND_ID=$(head /dev/urandom | tr -dc A-Z0-9 | head -c 4)
    REPO_NAME="lithic-backup-$RAND_ID"
    
    RESPONSE=$(curl -s -X POST "https://api.github.com/user/repos" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        -d "{\"name\":\"$REPO_NAME\",\"private\":true,\"description\":\"Lithic Automated Backup\"}")
    echo "$RESPONSE"

elif [[ "$REQUEST_URI" == */setup* ]] && [[ "$METHOD" == "POST" ]]; then
    read -r PAYLOAD
    TOKEN=$(extract_json_val "token" "$PAYLOAD")
    REPO_NAME=$(extract_json_val "repo" "$PAYLOAD")

    if [ -z "$TOKEN" ] || [ -z "$REPO_NAME" ]; then
        echo '{"error":"missing_params"}'
        exit 0
    fi

    # Save token & setup remote
    mkdir -p "${DATA_DIR}/.git"
    echo "$TOKEN" > "${DATA_DIR}/.git/backup_token"
    git -C "${DATA_DIR}" remote remove origin >/dev/null 2>&1
    git -C "${DATA_DIR}" remote add origin "https://oauth2:${TOKEN}@github.com/${REPO_NAME}.git"

    # Polite Merge logic (captured to log)
    git -C "${DATA_DIR}" pull origin main --allow-unrelated-histories --strategy-option=ours > /tmp/git_sync.log 2>&1
    git -C "${DATA_DIR}" push -u origin main >> /tmp/git_sync.log 2>&1
    
    if [ $? -eq 0 ]; then
        echo "last_sync=$(date +%s)" > "${DATA_DIR}/.git/backup_status"
        echo "{\"status\":\"success\",\"repo\":\"$REPO_NAME\"}"
    else
        LOG=$(cat /tmp/git_sync.log | tr '\n' ' ' | sed 's/"/\\"/g')
        echo "{\"status\":\"error\",\"message\":\"$LOG\"}"
    fi

elif [[ "$REQUEST_URI" == */status* ]]; then
    if [ ! -f "${DATA_DIR}/.git/backup_token" ]; then
        echo '{"connected":false}'
    else
        REPO=$(git -C "${DATA_DIR}" remote get-url origin | sed -E 's|.*github\.com/(.*)\.git|\1|')
        LAST_SYNC=0
        if [ -f "${DATA_DIR}/.git/backup_status" ]; then
            LAST_SYNC=$(grep "last_sync=" "${DATA_DIR}/.git/backup_status" | cut -d= -f2)
        fi
        echo "{\"connected\":true,\"repo\":\"$REPO\",\"last_sync\":$LAST_SYNC}"
    fi

elif [[ "$REQUEST_URI" == */disconnect* ]]; then
    # Wipe credentials and status for a clean reconnect
    rm -f "${DATA_DIR}/.git/backup_token"
    rm -f "${DATA_DIR}/.git/backup_status"
    echo '{"status":"disconnected"}'

else
    echo "{\"error\":\"route_not_found\",\"uri\":\"$REQUEST_URI\"}"
fi
