#!/usr/bin/env bash
# Kullanım: archive-replaced-source.sh "<neden>" <dosya1> [dosya2 ...]
# Eski kaynakları archive/code-replacements/ altına taşır (git mv).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ $# -lt 2 ]]; then
  echo "Kullanım: $0 \"<neden>\" <dosya> ..." >&2
  exit 1
fi

REASON="$1"
shift
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SLUG="$(printf '%s' "$REASON" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-|-$//g' | cut -c1-48)"
DEST_DIR="archive/code-replacements/${STAMP}-${SLUG}"
MANIFEST="archive/code-replacements/manifest.jsonl"

mkdir -p "${DEST_DIR}"
FILES_JSON="["
FIRST=1
MOVED=()

for rel in "$@"; do
  rel="${rel#./}"
  if [[ ! -e "${rel}" ]]; then
    echo "HATA: dosya yok: ${rel}" >&2
    exit 1
  fi
  case "${rel}" in
    archive/*)
      echo "HATA: zaten arşivde: ${rel}" >&2
      exit 1
      ;;
  esac
  target="${DEST_DIR}/${rel}"
  mkdir -p "$(dirname "${target}")"
  git mv -f "${rel}" "${target}"
  MOVED+=("${rel}")
  if [[ "${FIRST}" -eq 1 ]]; then
    FILES_JSON+="\"${rel}\""
    FIRST=0
  else
    FILES_JSON+=",\"${rel}\""
  fi
done
FILES_JSON+="]"

COMMIT="$(git rev-parse HEAD 2>/dev/null || echo null)"
LINE="$(node -e "
const o = {
  at: process.argv[1],
  reason: process.argv[2],
  dest: process.argv[3],
  files: JSON.parse(process.argv[4]),
  commit: process.argv[5],
};
console.log(JSON.stringify(o));
" "${STAMP}" "${REASON}" "${DEST_DIR}" "${FILES_JSON}" "${COMMIT}")"

printf '%s\n' "${LINE}" >> "${MANIFEST}"
git add "${MANIFEST}" "${DEST_DIR}"

echo "OK: ${#MOVED[@]} dosya → ${DEST_DIR}"
echo "     manifest güncellendi; commit için: git commit -m \"chore(archive): ${REASON}\""
