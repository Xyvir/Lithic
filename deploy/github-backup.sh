#!/bin/bash
# ==============================================================================
# Lithic GitHub Backup — API Handler (CGI)
# Handles OAuth Device Flow and Git Initialization
# ==============================================================================

# CGI Headers
echo "Content-Type: application/json"
echo ""

DATA_DIR="/data"
CLIENT_ID="Ov23likV8x7L0FfXoB1C" # Lithic Public App (Example - User may want to change this)
# Note: For security, the user should provide their own CLIENT_ID via ENV.
CLIENT_ID="${GITHUB_CLIENT_ID:-$CLIENT_ID}"

# Parse Request
REQUEST_URI="${REQUEST_URI:-}"
METHOD="${REQUEST_METHOD:-GET}"

# Simple Routing
if [[ "$REQUEST_URI" == */device-code* ]]; then
    # Step 1: Request Device Code
    RESPONSE=$(curl -s -X POST https://github.com/login/device/code \
        -H "Accept: application/json" \
        -d "client_id=${CLIENT_ID}&scope=repo")
    if [ $? -ne 0 ] || [ -z "$RESPONSE" ]; then
        echo '{"error":"network_error","error_description":"Failed to reach GitHub. Check container internet access."}'
    else
        echo "$RESPONSE"
    fi

elif [[ "$REQUEST_URI" == */poll* ]]; then
    # Step 2: Poll for token
    DEVICE_CODE=$(echo "$QUERY_STRING" | sed -n 's/.*device_code=\([^&]*\).*/\1/p')
    RESPONSE=$(curl -s -X POST https://github.com/login/oauth/access_token \
        -H "Accept: application/json" \
        -d "client_id=${CLIENT_ID}&device_code=${DEVICE_CODE}&grant_type=urn:ietf:params:oauth:grant-type:device_code")
    echo "$RESPONSE"

elif [[ "$REQUEST_URI" == */setup* ]] && [[ "$METHOD" == "POST" ]]; then
    # Step 3: Setup Remote & Initial Sync
    # Read JS payload from stdin
    read -r PAYLOAD
    TOKEN=$(echo "$PAYLOAD" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
    REPO_NAME=$(echo "$PAYLOAD" | sed -n 's/.*"repo":"\([^"]*\)".*/\1/p')

    if [ -z "$TOKEN" ] || [ -z "$REPO_NAME" ]; then
        echo '{"error":"missing_params"}'
        exit 0
    fi

    # Save Token
    mkdir -p "${DATA_DIR}/.git"
    echo "$TOKEN" > "${DATA_DIR}/.git/backup_token"

    # Set Remote
    git -C "${DATA_DIR}" remote remove origin >/dev/null 2>&1
    git -C "${DATA_DIR}" remote add origin "https://oauth2:${TOKEN}@github.com/${REPO_NAME}.git"

    # Polite Merge logic
    echo "{\"status\":\"starting_sync\",\"repo\":\"$REPO_NAME\"}"
    
    # 1. Non-Destructive Pull
    git -C "${DATA_DIR}" pull origin main --allow-unrelated-histories --strategy-option=ours > /tmp/git_sync.log 2>&1
    
    # 2. Initial Push
    git -C "${DATA_DIR}" push -u origin main >> /tmp/git_sync.log 2>&1
    
    if [ $? -eq 0 ]; then
        echo "last_sync=$(date +%s)" > "${DATA_DIR}/.git/backup_status"
        echo '{"status":"success"}'
    else
        LOG=$(cat /tmp/git_sync.log | tr '\n' ' ')
        echo "{\"status\":\"error\",\"message\":\"$LOG\"}"
    fi

elif [[ "$REQUEST_URI" == */status* ]]; then
    # Step 4: Get Status
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

else
    echo '{"error":"not_found"}'
fi
