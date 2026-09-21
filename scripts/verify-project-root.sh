#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f "package.json" ]]; then
  echo "HATA: package.json bulunamadı."
  echo "Bu komutları proje kök dizininde çalıştırın (nakliyeborsasi klasörü)."
  echo "Örnek: cd /var/www/nakliyeborsasi"
  exit 1
fi

if ! grep -q '"name": "nakliyeborsasi"' package.json; then
  echo "HATA: Bu package.json nakliyeborsasi monorepo'su değil."
  exit 1
fi

echo "OK: Proje kök dizini doğrulandı ($(pwd))"
