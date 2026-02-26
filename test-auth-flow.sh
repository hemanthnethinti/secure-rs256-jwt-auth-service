#!/usr/bin/env sh
set -eu

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
USERNAME="testuser_$(date +%s)"
EMAIL="${USERNAME}@example.com"
PASSWORD='Strong@123'

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

require_cmd curl
require_cmd jq

echo "[1/6] Registering user: $USERNAME"
REGISTER_RESPONSE=$(curl -sS -X POST "$API_BASE_URL/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USERNAME\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

echo "$REGISTER_RESPONSE" | jq '.'

echo "[2/6] Logging in"
LOGIN_RESPONSE=$(curl -sS -X POST "$API_BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refresh_token')

if [ "$ACCESS_TOKEN" = "null" ] || [ "$REFRESH_TOKEN" = "null" ]; then
  echo "Login failed, tokens not found"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo "Login successful"

echo "[3/6] Calling protected profile endpoint"
PROFILE_RESPONSE=$(curl -sS -X GET "$API_BASE_URL/api/profile" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "$PROFILE_RESPONSE" | jq '.'

echo "[4/6] Refreshing access token"
REFRESH_RESPONSE=$(curl -sS -X POST "$API_BASE_URL/auth/refresh" \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}")

NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.access_token')

if [ "$NEW_ACCESS_TOKEN" = "null" ]; then
  echo "Refresh failed"
  echo "$REFRESH_RESPONSE" | jq '.'
  exit 1
fi

echo "[5/6] Calling protected profile endpoint with refreshed access token"
PROFILE_RESPONSE_2=$(curl -sS -X GET "$API_BASE_URL/api/profile" \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN")
echo "$PROFILE_RESPONSE_2" | jq '.'

echo "[6/6] Logging out (revoking refresh token)"
LOGOUT_STATUS=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$API_BASE_URL/auth/logout" \
  -H 'Content-Type: application/json' \
  -d "{\"refresh_token\":\"$REFRESH_TOKEN\"}")

if [ "$LOGOUT_STATUS" != "204" ]; then
  echo "Logout failed, status: $LOGOUT_STATUS"
  exit 1
fi

echo "Authentication flow completed successfully"
