#!/usr/bin/env bash
# Şeffaf zeminli Lerta logosu — koyu grain'i at, altın maske, alpha erosion (nokta/halo yok).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IN="${ROOT}/apps/mail-marketing/public/brand/lerta-hero-animation.mp4"
OUT_WEBM="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-transparent.webm"
OUT_PNG="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-header.png"

command -v ffmpeg >/dev/null

read -r -d '' FC <<'EOF' || true
[0:v]crop=420:230:46:28,hqdn3d=10:7:10:7,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(r(X,Y)+g(X,Y),165),0,if(lt(r(X,Y)+g(X,Y),b(X,Y)*2.3),0,if(gt(r(X,Y),110)*gt(g(X,Y),88)*gt(r(X,Y),b(X,Y)+24),255,0)))'[c];[c]split[clr][asrc];[asrc]alphaextract,erosion[alpha];[clr][alpha]alphamerge[out]
EOF

ffmpeg -y -i "${IN}" \
  -filter_complex "${FC}" \
  -map "[out]" \
  -an -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 320k -deadline good -cpu-used 2 \
  "${OUT_WEBM}"

ffmpeg -y -i "${IN}" \
  -filter_complex "${FC}" \
  -map "[out]" \
  -frames:v 1 -update 1 \
  "${OUT_PNG}"

echo "OK: ${OUT_WEBM}"
echo "OK: ${OUT_PNG}"
