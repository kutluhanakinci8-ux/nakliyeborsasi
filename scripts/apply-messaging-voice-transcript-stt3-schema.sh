#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL="${ROOT}/scripts/sql/messaging-voice-transcript-stt3.sql"
: "${DATABASE_URL:?DATABASE_URL required}"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${SQL}"
echo "OK: STT-3 company messaging settings schema applied"
