#!/usr/bin/env bash
# Faz A — Postfix + OpenDKIM on Ubuntu/Debian VPS (own MTA, no ESP).
# Run as root on the mail-sending host. Review before production.
set -euo pipefail

MAIL_HOSTNAME="${MAIL_HOSTNAME:-mail.lerta.tr}"
PLATFORM_FROM="${PLATFORM_FROM:-notifications@mail.lerta.tr}"
INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"

export DEBIAN_FRONTEND=noninteractive

echo "==> Installing Postfix + OpenDKIM"
apt-get update
apt-get install -y postfix opendkim opendkim-tools

echo "==> Configuring Postfix (myhostname=${MAIL_HOSTNAME})"
postconf -e "myhostname = ${MAIL_HOSTNAME}"
postconf -e "myorigin = ${MAIL_HOSTNAME}"
postconf -e "inet_interfaces = loopback-only"
postconf -e "inet_protocols = ipv4"
postconf -e "mydestination ="
postconf -e "relayhost ="
postconf -e "smtp_tls_security_level = may"
postconf -e "milter_default_action = accept"
postconf -e "milter_protocol = 6"
postconf -e "smtpd_milters = inet:127.0.0.1:8891"
postconf -e "non_smtpd_milters = inet:127.0.0.1:8891"

DKIM_DIR="/etc/opendkim/keys/${MAIL_HOSTNAME}"
mkdir -p "${DKIM_DIR}"
if [[ ! -f "${DKIM_DIR}/default.private" ]]; then
  echo "==> Generating DKIM key (selector: default)"
  opendkim-genkey -b 2048 -d "${MAIL_HOSTNAME}" -s default -D "${DKIM_DIR}"
  chown -R opendkim:opendkim /etc/opendkim
fi

KEYTABLE_LINE="default._domainkey.${MAIL_HOSTNAME} ${MAIL_HOSTNAME}:default:${DKIM_DIR}/default.private"
SIGNINGTABLE_LINE="*@${MAIL_HOSTNAME} default._domainkey.${MAIL_HOSTNAME}"

grep -qF "${KEYTABLE_LINE}" /etc/opendkim/KeyTable 2>/dev/null || echo "${KEYTABLE_LINE}" >> /etc/opendkim/KeyTable
grep -qF "${SIGNINGTABLE_LINE}" /etc/opendkim/SigningTable 2>/dev/null || echo "${SIGNINGTABLE_LINE}" >> /etc/opendkim/SigningTable

cat >/etc/opendkim.conf <<'EOF'
Syslog                  yes
UMask                   002
Canonicalization        relaxed/simple
Mode                    sv
SubDomains              no
AutoRestart             yes
AutoRestartRate         10/1h
OversignHeaders         From
Socket                  inet:8891@127.0.0.1
KeyTable                /etc/opendkim/KeyTable
SigningTable            refile:/etc/opendkim/SigningTable
ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts
InternalHosts           refile:/etc/opendkim/TrustedHosts
EOF

PUBLIC_TXT_FILE="${DKIM_DIR}/default.txt"
if [[ -f "${PUBLIC_TXT_FILE}" ]]; then
  echo ""
  echo "========== DKIM DNS (isimtescil) =========="
  echo "Host: default._domainkey.${MAIL_HOSTNAME}"
  cat "${PUBLIC_TXT_FILE}"
  echo "==========================================="
fi

VPS_IP="$(curl -fsS -4 --max-time 5 https://api.ipify.org 2>/dev/null || true)"
if [[ -n "${VPS_IP}" ]]; then
  echo ""
  echo "SPF hint: v=spf1 ip4:${VPS_IP} -all  (host: ${MAIL_HOSTNAME})"
fi

systemctl enable postfix opendkim
systemctl restart opendkim postfix

echo ""
echo "Postfix listens on 127.0.0.1:25 for local apps."
echo "Next: bash ${INSTALL_DIR}/scripts/vps-enable-production-smtp.sh"
echo "Set MAIL_PLATFORM_DKIM_TXT in .env from the DKIM TXT above (p= value)."
