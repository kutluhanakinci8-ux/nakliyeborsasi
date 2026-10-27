#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${DATABASE_URL:?DATABASE_URL required}"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${ROOT}/scripts/sql/messaging-voice-transcript-br1.sql"
echo "OK: BR-1 voice transcript schema applied"
