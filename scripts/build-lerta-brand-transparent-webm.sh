#!/usr/bin/env bash
# Şeffaf Lerta logosu — görünür logo + temiz zemin (erosion yok; ince altın çizgi kalır).
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
[0:v]crop=420:230:46:28,hqdn3d=6:4:6:4,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(r(X,Y)+g(X,Y),118),0,if(gt(r(X,Y),98)*gt(g(X,Y),76)*gt(r(X,Y),b(X,Y)+12)*gt(g(X,Y),b(X,Y)+6),255,0))'[out]
EOF

ffmpeg -y -i "${IN}" \
  -filter_complex "${FC}" \
  -map "[out]" \
  -fps_mode passthrough \
  "${TMP}/frame_%04d.png"

ffmpeg -y -framerate 10 -start_number 1 -i "${TMP}/frame_%04d.png" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -crf 16 -b:v 0 -deadline good -cpu-used 2 \
  "${OUT_WEBM}"

cp "${TMP}/frame_0001.png" "${OUT_PNG}"

ffmpeg -y -i "${OUT_PNG}" \
  -vf "format=rgb24" -q:v 2 \
  -frames:v 1 -update 1 \
  "${OUT_POSTER}"

python3 - <<PY
import subprocess
import sys
path = "${OUT_PNG}"
p = subprocess.run(
    ["ffmpeg", "-y", "-i", path, "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
    stdout=subprocess.PIPE,
    stderr=subprocess.DEVNULL,
)
d = p.stdout
alpha = sum(1 for i in range(len(d) // 4) if d[i * 4 + 3] > 128)
if alpha < 1200:
    print("HATA: logo PNG alpha çok düşük (", alpha, " piksel)", file=sys.stderr)
    sys.exit(1)
print("OK: PNG alpha piksel", alpha)
PY

echo "OK: ${OUT_WEBM}"
echo "OK: ${OUT_PNG}"
echo "OK: ${OUT_POSTER}"
