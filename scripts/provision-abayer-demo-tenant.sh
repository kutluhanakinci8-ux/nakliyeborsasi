#!/usr/bin/env bash
# Abayer müşteri denemesi — karagoz@abayer.com (VPS’te çalıştırın; şifreyi repoya yazmayın).
set -euo pipefail

API_BASE="${API_BASE:-http://127.0.0.1:3010/api/v1}"
LOGIN_EMAIL="${ABAYER_DEMO_LOGIN_EMAIL:-karagoz@abayer.com}"
DEMO_PASSWORD="${ABAYER_DEMO_PASSWORD:-}"
COMPANY_NAME="${ABAYER_DEMO_COMPANY_NAME:-Abayer Deneme}"
LOCAL_PART="${ABAYER_DEMO_LOCAL_PART:-karagoz}"
CUSTOM_DOMAIN="${ABAYER_DEMO_DOMAIN:-abayer.com}"
ENV_FILE="${LERTA_ENV_FILE:-/var/www/nakliyeborsasi/.env}"
INSTALL_DIR="${INSTALL_DIR:-/var/www/nakliyeborsasi}"

if [[ -z "${DEMO_PASSWORD}" ]]; then
  DEMO_PASSWORD="$(python3 -c 'import secrets,string; print("".join(secrets.choice(string.ascii_letters+string.digits) for _ in range(14))+"!")')"
fi

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "ENV file missing: ${ENV_FILE}" >&2
  exit 1
fi

DATABASE_URL=""
while IFS= read -r line || [[ -n "${line}" ]]; do
  [[ "${line}" =~ ^DATABASE_URL= ]] || continue
  DATABASE_URL="${line#DATABASE_URL=}"
  DATABASE_URL="${DATABASE_URL%\"}"
  DATABASE_URL="${DATABASE_URL#\"}"
done < "${ENV_FILE}"

if [[ -z "${DATABASE_URL}" ]]; then
  echo "DATABASE_URL missing" >&2
  exit 1
fi

export API_BASE LOGIN_EMAIL DEMO_PASSWORD COMPANY_NAME LOCAL_PART CUSTOM_DOMAIN DATABASE_URL

python3 <<'PY'
import base64, json, os, subprocess, urllib.error, urllib.request

API = os.environ["API_BASE"].rstrip("/")
EMAIL = os.environ["LOGIN_EMAIL"]
PWD = os.environ["DEMO_PASSWORD"]
COMPANY = os.environ["COMPANY_NAME"]
LOCAL = os.environ["LOCAL_PART"]
DOMAIN = os.environ["CUSTOM_DOMAIN"]
DB = os.environ["DATABASE_URL"]


def post(path, body, token=None):
    data = json.dumps(body).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        f"{API}{path}", data=data, headers=headers, method="POST"
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())


def company_id(token: str) -> str:
    payload = token.split(".")[1]
    payload += "=" * ((4 - len(payload) % 4) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))["companyId"]


def set_password_hash():
    digest = (
        subprocess.check_output(
            [
                "node",
                "-e",
                'const b=require("bcrypt");b.hash(process.argv[1],12).then(h=>process.stdout.write(h))',
                PWD,
            ],
            cwd="/var/www/nakliyeborsasi/apps/api",
            text=True,
        )
        .strip()
        .replace("'", "''")
    )
    sql = (
        f'UPDATE user_accounts SET "passwordHash" = \'{digest}\' '
        f'WHERE lower("emailAddress") = lower(\'{EMAIL}\');'
    )
    subprocess.run(["psql", DB, "-v", "ON_ERROR_STOP=1", "-c", sql], check=True)


try:
    token = post(
        "/auth/register",
        {
            "emailAddress": EMAIL,
            "password": PWD,
            "displayName": "Karagöz",
            "companyLegalName": COMPANY,
            "companyCountryCode": "TR",
            "companyParticipantTypeCode": "LOAD_SHIPPER",
            "subscriptionPlanCode": "lerta_mail_corporate_tr",
        },
    )["accessToken"]
except urllib.error.HTTPError as err:
    if err.code not in (400, 409, 422):
        raise
    set_password_hash()
    token = post("/auth/login", {"emailAddress": EMAIL, "password": PWD})[
        "accessToken"
    ]

org = company_id(token)

try:
    post(
        "/company/mail-identity/subscription/select",
        {"planCode": "lerta_mail_corporate_tr"},
        token,
    )
except urllib.error.HTTPError:
    pass

try:
    post("/company/mail-identity/custom-domain", {"domain": DOMAIN}, token)
except urllib.error.HTTPError:
    pass

subprocess.run(
    [
        "psql",
        DB,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        f'UPDATE mail_domains SET "verificationStatus" = \'verified\' '
        f'WHERE domain = \'{DOMAIN}\' AND "organizationId" = \'{org}\';',
    ],
    check=True,
)

prov = post(
    "/company/mail-identity/custom-domain/provision",
    {"localPart": LOCAL, "displayName": "Karagöz", "makeDefault": True},
    token,
)
mailbox = prov.get("fromAddress", f"{LOCAL}@{DOMAIN}")
print(f"MAILBOX={mailbox}")
PY

if [[ -x "${INSTALL_DIR}/scripts/rebuild-postfix-inbound-from-virtual.sh" ]]; then
  (
    cd "${INSTALL_DIR}"
    MAIL_INBOUND_APPLY_POSTFIX=true bash scripts/rebuild-postfix-inbound-from-virtual.sh
  ) || true
fi

echo ""
echo "======== Abayer demo hazır ========"
echo "Webmail: https://posta.lerta.com.tr/login"
echo "Giriş e-postası: ${LOGIN_EMAIL}"
echo "Şifre: ${DEMO_PASSWORD}"
echo "Posta kutusu: ${LOCAL_PART}@${CUSTOM_DOMAIN}"
echo "UYARI: @${CUSTOM_DOMAIN} dış posta için müşteri MX kaydı gerekir."
