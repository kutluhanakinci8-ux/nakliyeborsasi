#!/usr/bin/env bash
# CI / deploy: yalnızca main dalından üretim deploy uyarısı.
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-${GITHUB_REF_NAME:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)}}"
if [[ "${BRANCH}" != "main" ]]; then
  echo "UYARI: üretim deploy beklenen dal main, şu an: ${BRANCH}" >&2
  if [[ "${REQUIRE_MAIN_DEPLOY:-0}" == "1" ]]; then
    exit 1
  fi
fi
echo "OK: branch policy (${BRANCH})"
