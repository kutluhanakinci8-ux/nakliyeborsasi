#!/usr/bin/env bash
# OpenDKIM 451 4.7.1 — API MAIL_SYNC_OPENDKIM anahtarları root:root kalırsa imza reddedilir.
set -euo pipefail

if [[ ! -d /etc/opendkim/keys ]]; then
  echo "OpenDKIM keys dizini yok." >&2
  exit 1
fi

chown -R opendkim:opendkim /etc/opendkim/keys
find /etc/opendkim/keys -type f -name '*.private' -exec chmod 600 {} \;
systemctl restart opendkim postfix
echo "Tamam: /etc/opendkim/keys → opendkim:opendkim"
