#!/usr/bin/env bash
# WhatsApp ses (webm→ogg) ve STT smoke için ffmpeg.
set -euo pipefail

if command -v ffmpeg >/dev/null 2>&1; then
  echo "OK: ffmpeg $(ffmpeg -version 2>/dev/null | head -1)"
  exit 0
fi

echo "ffmpeg bulunamadı — kurulum deneniyor…"

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  if command -v sudo >/dev/null 2>&1; then
    sudo apt-get update -qq
    sudo apt-get install -y ffmpeg
  else
    apt-get update -qq
    apt-get install -y ffmpeg
  fi
elif command -v dnf >/dev/null 2>&1; then
  if command -v sudo >/dev/null 2>&1; then
    sudo dnf install -y ffmpeg
  else
    dnf install -y ffmpeg
  fi
else
  echo "FAIL: ffmpeg yok ve bilinmeyen paket yöneticisi — manuel: apt install ffmpeg"
  exit 1
fi

command -v ffmpeg >/dev/null 2>&1
echo "OK: ffmpeg kuruldu"
