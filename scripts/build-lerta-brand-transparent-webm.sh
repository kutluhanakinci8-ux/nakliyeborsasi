#!/usr/bin/env bash
# Şeffaf zeminli Lerta logosu — altın maske (colorkey grain/nokta bırakmaz).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IN="${ROOT}/apps/mail-marketing/public/brand/lerta-hero-animation.mp4"
OUT_WEBM="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-transparent.webm"
OUT_PNG="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-header.png"

command -v ffmpeg >/dev/null

VF="crop=420:230:46:28,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(gt(r(X,Y)+g(X,Y),112)*gt(r(X,Y),b(X,Y)+16)*gt(g(X,Y),b(X,Y)+10)*lt(b(X,Y),125),255,0)'"

ffmpeg -y -i "${IN}" \
  -vf "${VF},format=yuva420p" \
  -an -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 240k \
  "${OUT_WEBM}"

ffmpeg -y -i "${IN}" \
  -vf "${VF}" \
  -frames:v 1 \
  "${OUT_PNG}"

echo "OK: ${OUT_WEBM}"
echo "OK: ${OUT_PNG}"
