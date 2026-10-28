#!/usr/bin/env bash
# Şeffaf zeminli header/hero logosu (VP9 alpha WebM).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IN="${ROOT}/apps/mail-marketing/public/brand/lerta-hero-animation.mp4"
OUT="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-transparent.webm"
command -v ffmpeg >/dev/null
ffmpeg -y -i "${IN}" \
  -vf "colorkey=0x000000:0.12:0.18,format=yuva420p" \
  -an -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 180k \
  "${OUT}"
echo "OK: ${OUT}"
