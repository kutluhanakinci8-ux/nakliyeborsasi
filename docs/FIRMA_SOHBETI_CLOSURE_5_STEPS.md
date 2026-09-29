# Firma sohbeti — 5 kapanış adımı (%100 hedef)

| # | Adım | Komut | Durum |
|---|------|--------|--------|
| 1 | Pilot NPS (5 firma + WAU) | `PILOT_NPS_STRICT=1 bash scripts/verify-firma-sohbeti-pilot-nps.sh` | Veri: `data/firma-sohbeti-pilot-nps.json` |
| 2 | Deploy + showcase verify | `bash scripts/deploy-vps-ssh.sh` (PR #166+) | Deploy sonrası excellence verify |
| 3 | FS-10 Lighthouse + axe | `verify-lighthouse-messaging-mobile.sh` · `verify-axe-messaging.sh` | Mobil perf ≥75 · kritik 0 |
| 4 | FS-8.3 SSE | `API_BASE=… bash scripts/run-prod-fs83-two-instance-smoke.sh` | İkinci instance: `SMOKE_SECOND_API_PORT=3012` |
| 5 | FS-12 WA sandbox | `verify-messaging-wa-bridge-sandbox.sh` | Ops: `MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL` |

Tek özet:

```bash
API_BASE=https://app.lerta.com.tr/api/v1 \
  MESSAGING_TEST_EMAIL=yukveren01@test.nakliyeborsasi.local \
  MESSAGING_TEST_PASSWORD='TestPass123!' \
  bash scripts/verify-firma-sohbeti-closure-5.sh
```
