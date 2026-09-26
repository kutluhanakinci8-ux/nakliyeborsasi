#!/usr/bin/env bash
# Canlı harita demo: Kutluhan Test Şoför (+905546902543) için telemetri izi.
# API yeniden başlatıldığında seed de çalışır; bu script yalnızca API restart tetikler.
set -euo pipefail
INSTALL_DIR="${1:-/var/www/nakliyeborsasi}"
echo "Kutluhan telemetri seed API onModuleInit ile yüklenir."
echo "==> API restart: ${INSTALL_DIR}"
bash "${INSTALL_DIR}/scripts/restart-api.sh" "${INSTALL_DIR}"
echo "Sonra: Kutluhantest ile giriş → /hesap/filo/harita"
