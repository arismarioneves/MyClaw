#!/usr/bin/env bash
# Send a message to your Telegram chat from shell scripts or Claude tasks.
# Usage: ./scripts/notify.sh "Your message here"
#
# Example from a long task:
#   bash "$(pwd)/scripts/notify.sh" "Task complete: built 14 files"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env"

# Read .env
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: .env not found at $ENV_FILE" >&2
  exit 1
fi

BOT_TOKEN=""
CHAT_ID=""

while IFS='=' read -r key value; do
  key="${key%%#*}"       # strip inline comments
  key="${key// /}"       # strip spaces
  value="${value## }"    # strip leading space
  value="${value%% }"    # strip trailing space
  value="${value%\"}"    # strip trailing quote
  value="${value#\"}"    # strip leading quote
  value="${value%\'}"
  value="${value#\'}"
  [[ -z "$key" || "$key" == \#* ]] && continue
  [[ "$key" == "TELEGRAM_BOT_TOKEN" ]] && BOT_TOKEN="$value"
  [[ "$key" == "ALLOWED_CHAT_ID" ]] && CHAT_ID="$value"
done < "$ENV_FILE"

if [[ -z "$BOT_TOKEN" ]]; then
  echo "Error: TELEGRAM_BOT_TOKEN not set in .env" >&2
  exit 1
fi

if [[ -z "$CHAT_ID" ]]; then
  echo "Error: ALLOWED_CHAT_ID not set in .env" >&2
  exit 1
fi

MESSAGE="${1:-}"
if [[ -z "$MESSAGE" ]]; then
  echo "Usage: $0 \"Your message\"" >&2
  exit 1
fi

curl -s -X POST \
  "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
  -H "Content-Type: application/json" \
  -d "{\"chat_id\": \"${CHAT_ID}\", \"text\": \"${MESSAGE}\"}" \
  > /dev/null

echo "Sent: $MESSAGE"
