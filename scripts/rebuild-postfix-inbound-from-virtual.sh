#!/usr/bin/env bash
# Eski virtual dosyasındaki doğrudan pipe satırlarını stub+aliases formatına çevirir (geçiş).
set -euo pipefail

VIRTUAL_PATH="${MAIL_INBOUND_POSTFIX_VIRTUAL_PATH:-/etc/postfix/lerta-inbound-virtual}"
ALIASES_PATH="${MAIL_INBOUND_POSTFIX_ALIASES_PATH:-/etc/postfix/lerta-inbound-aliases}"
PIPE_SCRIPT="${MAIL_INBOUND_PIPE_SCRIPT:-/var/www/nakliyeborsasi/scripts/postfix-pipe-inbound-to-api.sh}"

if [[ ! -f "${VIRTUAL_PATH}" ]]; then
  exit 0
fi

stub_for() {
  local email="$1"
  echo "lerta-inbound-$(echo "$email" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -c1-120)"
}

TMP_V="$(mktemp)"
TMP_A="$(mktemp)"
while IFS=$'\t' read -r email rhs; do
  [[ -z "${email}" || "${email}" =~ ^# ]] && continue
  rhs="${rhs//\"/}"
  if [[ "${rhs}" == \|* ]]; then
    stub="$(stub_for "${email}")"
    printf '%s\t%s\n' "${email}" "${stub}" >> "${TMP_V}"
    printf '%s: "|%s"\n' "${stub}" "${rhs#|} ${email}" >> "${TMP_A}"
  elif [[ "${rhs}" == lerta-inbound-* ]]; then
    printf '%s\t%s\n' "${email}" "${rhs}" >> "${TMP_V}"
  else
    stub="$(stub_for "${email}")"
    printf '%s\t%s\n' "${email}" "${stub}" >> "${TMP_V}"
    printf '%s: "|%s %s"\n' "${stub}" "${PIPE_SCRIPT}" "${email}" >> "${TMP_A}"
  fi
done < "${VIRTUAL_PATH}"

if [[ -s "${TMP_V}" ]]; then
  mv "${TMP_V}" "${VIRTUAL_PATH}"
  postmap "${VIRTUAL_PATH}"
fi
if [[ -s "${TMP_A}" ]]; then
  mv "${TMP_A}" "${ALIASES_PATH}"
  postalias "${ALIASES_PATH}"
fi
rm -f "${TMP_V}" "${TMP_A}"
