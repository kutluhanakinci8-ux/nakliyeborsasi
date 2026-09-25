#!/usr/bin/env bash
# Faz C4 — Rspamd milter (Postfix inbound/outbound scanning)
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y rspamd

# Rspamd tarama + OpenDKIM imza (Faz A) birlikte
postconf -e "smtpd_milters = inet:127.0.0.1:11332, inet:127.0.0.1:8891"
postconf -e "non_smtpd_milters = inet:127.0.0.1:11332, inet:127.0.0.1:8891"
postconf -e "milter_default_action = accept"
postconf -e "milter_protocol = 6"

systemctl enable rspamd
systemctl restart rspamd postfix
echo "Rspamd milter 127.0.0.1:11332 — Postfix yeniden yüklendi."
echo "Pipe: scripts/postfix-pipe-inbound-to-api.sh rspamc skorunu API'ye iletir."
echo ".env: MAIL_RSPAMD_REJECT_SCORE=15"
