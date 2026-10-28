#!/usr/bin/env bash
# Kurumsal şeffaf Lerta logosu — aynı animasyon, temiz alpha (grain/nokta yok).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IN="${ROOT}/apps/mail-marketing/public/brand/lerta-hero-animation.mp4"
OUT_WEBM="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-transparent.webm"
OUT_PNG="${ROOT}/apps/mail-marketing/public/brand/lerta-brand-header.png"
OUT_POSTER="${ROOT}/apps/mail-marketing/public/brand/lerta-hero-poster.jpg"

command -v ffmpeg >/dev/null

TMP="$(mktemp -d)"
cleanup() { rm -rf "${TMP}"; }
trap cleanup EXIT

read -r -d '' FC <<'EOF' || true
[0:v]crop=420:230:46:28,hqdn3d=12:9:12:9,format=rgba[base];
[base]geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(r(X,Y)+g(X,Y),168),0,if(lt(r(X,Y)+g(X,Y),b(X,Y)*2.35),0,if(gt(r(X,Y),112)*gt(g(X,Y),90)*gt(r(X,Y),b(X,Y)+26),255,0)))'[m];
[m]split[clr][asrc];
[asrc]alphaextract,erosion,erosion[alpha];
[clr][alpha]alphamerge[out]
EOF

ffmpeg -y -i "${IN}" \
  -filter_complex "${FC}" \
  -map "[out]" \
  -fps_mode passthrough \
  "${TMP}/frame_%04d.png"

ffmpeg -y -framerate 10 -start_number 1 -i "${TMP}/frame_%04d.png" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -crf 12 -b:v 0 -deadline best -cpu-used 0 \
  "${OUT_WEBM}"

cp "${TMP}/frame_0001.png" "${OUT_PNG}"

ffmpeg -y -i "${OUT_PNG}" \
  -vf "format=rgb24" \
  -q:v 2 \
  "${OUT_POSTER}"

echo "OK: ${OUT_WEBM}"
echo "OK: ${OUT_PNG}"
echo "OK: ${OUT_POSTER}"
