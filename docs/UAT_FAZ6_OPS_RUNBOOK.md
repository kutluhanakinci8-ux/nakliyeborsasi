# Faz 6B — UAT ops runbook (sırayla)

**Önce:** Faz 6A kod kapısı (`bash scripts/uat-faz6-sequential.sh` → `code=PASS`) tamamlanmış olmalı.

## 1. VPS `.env`

```bash
export ENV_FILE=/var/www/nakliyeborsasi/.env
# veya geliştirme: repo köküne kopyala → /workspace/.env
```

Zorunlu anahtarlar (örnekler `.env.example`):

| Anahtar | UAT madde |
|---------|-----------|
| `OPERATOR_JWT` veya `OPERATOR_TEST_EMAIL` + `OPERATOR_TEST_PASSWORD` | Billing A1, admin smoke |
| `MICROSOFT_GRAPH_MAIL_*` | M3 Graph |
| `GOOGLE_CALENDAR_*` | M4 takvim |
| `GOOGLE_GMAIL_*` | Gmail posta / push |
| `MAIL_WEB_PUSH_VAPID_*` | M5 iOS PWA push |

## 2. Önkoşul taraması

```bash
bash scripts/verify-uat-ops-prereqs.sh
```

`READY` görünce devam.

## 3. Tek komut — tam ops sırası

```bash
export ENV_FILE=/var/www/nakliyeborsasi/.env
export INSTALL_DIR=/var/www/nakliyeborsasi
bash scripts/run-faz6-ops-sequence.sh
```

Müşteri kapısı da zorunlu:

```bash
RUN_CUSTOMER_READY_STRICT=1 bash scripts/run-faz6-ops-sequence.sh
```

## 4. Parça parça

```bash
UAT_VPS_RUNTIME=1 UAT_DEFER_OAUTH=0 bash scripts/uat-faz6-sequential.sh
bash scripts/smoke-imap-gold.sh
bash scripts/verify-mail-web-push-prod.sh
```

## 5. Raporlar

- `docs/reports/UAT_FAZ6_SEQUENTIAL.json`
- `docs/reports/UAT_FAZ6_CODE_COMPLETE.json`
- Premium QA: `UAT_VPS_RUNTIME=1 bash scripts/run-lerta-premium-qa-suite.sh`

## 6. Manuel imza (Faz 9)

Thunderbird IMAP, MSN/Gmail/Outlook teslimat kutusu, Graph/Google takvim canlı — `docs/EMAIL_PILOT_LERTA_COM_TR.md` §3.3.
