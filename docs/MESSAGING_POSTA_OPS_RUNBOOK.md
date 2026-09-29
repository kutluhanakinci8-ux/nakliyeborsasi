# Kurumsal iletişim — ops runbook (MP-5)

**Amaç:** SSE, WhatsApp köprüsü ve e-posta outbox tek bakışta; SLO ve smoke scriptleri.

## HTTP uçları

| Uç | Kimlik | İçerik |
|-----|--------|--------|
| `GET /health` | Herkese açık | `{ status: "ok" }` |
| `GET /health/live` | Herkese açık | DB yok · `messagingSse` bağlantı istatistikleri |
| `GET /health/ready` | Herkese açık | PostgreSQL `SELECT 1` |
| `GET /messaging/status` | Herkese açık | Modül özellikleri + `sse` + `whatsappBridge` |
| `GET /platform-admin/communications-ops/snapshot` | Platform operatör JWT | Posta outbox + teslimat + messaging SLO meta |

### Örnek (VPS / prod)

```bash
API_BASE=https://app.lerta.com.tr/api/v1
curl -fsS "${API_BASE}/health/live" | jq .
curl -fsS "${API_BASE}/messaging/status" | jq '.sse, .whatsappBridge'
curl -fsS -H "Authorization: Bearer ${OPERATOR_JWT}" \
  "${API_BASE}/platform-admin/communications-ops/snapshot" | jq .
```

## SLO (özet)

| Metrik | Hedef | Doğrulama |
|--------|--------|-----------|
| SSE ticket + bağlantı p95 | ≤ `MESSAGING_SSE_P95_MS_MAX` (varsayılan **8000** ms) | `bash scripts/smoke-messaging-sse-load.sh` + `MESSAGING_SSE_JWT` |
| Aynı thread mesaj görünürlük | **~2 sn** (ürün hedefi) | Manuel + SSE; smoke ticket süresi proxy değildir |
| Outbox kuyruk | `pending` ≤ 50, `failed` ≤ 25 (uyarı) | `communications-ops/snapshot` · `platform-admin/notifications/health` |

## Yapılandırılmış log (messaging)

WhatsApp köprü hataları JSON satırı:

```json
{"component":"messaging","event":"whatsapp_bridge_delivery_failed","companyId":"…","threadId":"…","reason":"…"}
```

Grep: `whatsapp_bridge_delivery_failed`

## Smoke (CI / VPS)

```bash
cd /var/www/nakliyeborsasi
bash scripts/verify-communications-ops-snapshot.sh
bash scripts/smoke-messaging-sse-load.sh   # JWT varsa p95
bash scripts/vps-operator-verify.sh
```

## Grafana

Hazır panel şablonu: `docs/observability/grafana-communications-ops.json` (HTTP / Infinity veya manuel snapshot ile beslenir).
