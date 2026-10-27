#!/usr/bin/env bash
# Sesli mesaj POST'u: API JSON gövde limiti (base64) nginx ile uyumlu olmalı.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAIN="${ROOT}/apps/api/src/main.ts"

if [[ ! -f "${MAIN}" ]]; then
  echo "FAIL: ${MAIN} bulunamadı" >&2
  exit 1
fi

if ! grep -q 'useBodyParser("json"' "${MAIN}"; then
  echo "FAIL: API JSON body parser limiti tanımlı değil (sesli mesaj 413 verir)." >&2
  exit 1
fi

if ! grep -q 'API_JSON_BODY_LIMIT' "${MAIN}"; then
  echo "FAIL: API_JSON_BODY_LIMIT yok." >&2
  exit 1
fi

echo "OK: messaging voice JSON body limit wired in apps/api/src/main.ts"
