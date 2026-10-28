#!/usr/bin/env bash
# Kanat ikonu — master referans PNG (net); SVG path karışıklığı yok.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MASTER="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-master.png"
OUT_1X="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-icon.png"
OUT_2X="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-icon@2x.png"

command -v ffmpeg >/dev/null
test -f "${MASTER}"

VF="crop=560:188:48:74,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(r(X,Y)+g(X,Y)+b(X,Y),58),0,255)'"

ffmpeg -y -i "${MASTER}" -vf "${VF}" -frames:v 1 -update 1 "${OUT_1X}"
ffmpeg -y -i "${OUT_1X}" -vf "scale=1120:376:flags=lanczos" -frames:v 1 -update 1 "${OUT_2X}"

echo "OK: ${OUT_1X}"
echo "OK: ${OUT_2X}"
