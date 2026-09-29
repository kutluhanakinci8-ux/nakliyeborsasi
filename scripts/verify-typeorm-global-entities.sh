#!/usr/bin/env bash
# Ensures every *Entity.ts under apps/api entities/ is listed in TypeOrmConfigurationFactory.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENTITIES_DIR="${ROOT}/apps/api/src/infrastructure/database/entities"
FACTORY="${ROOT}/apps/api/src/infrastructure/database/TypeOrmConfigurationFactory.ts"

if [[ ! -f "${FACTORY}" ]]; then
  echo "FAIL: TypeOrmConfigurationFactory not found: ${FACTORY}" >&2
  exit 1
fi

missing=()
while IFS= read -r file; do
  base="$(basename "${file}" .ts)"
  if ! grep -q "${base}" "${FACTORY}"; then
    missing+=("${base}")
  fi
done < <(find "${ENTITIES_DIR}" -maxdepth 1 -name '*Entity.ts' | sort)

if ((${#missing[@]} > 0)); then
  echo "FAIL: ${#missing[@]} entity class(es) missing from TypeOrmConfigurationFactory:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi

echo "OK: all $(find "${ENTITIES_DIR}" -maxdepth 1 -name '*Entity.ts' | wc -l | tr -d ' ') entities registered in TypeOrmConfigurationFactory"
