# FS-12 — Kanal ve mağaza

**Faz:** FS-12 (P3) · **Durum:** kod + doğrulama scripti

## 12A — WhatsApp bildirim köprüsü

- Ayar: `PATCH /messaging/integration/whatsapp-bridge` (firma sahibi)
- KVKK onayı: `kvkkNoticeAccepted: true` zorunlu
- Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`) veya `MESSAGING_WHATSAPP_BRIDGE_WEBHOOK_URL` ile teslim — **sunucuda biri tanımlı değilse firma ayarı “etkin” olsa bile WhatsApp mesajı gitmez**
- `GET /messaging/status` → `whatsappBridge` (kanal: `twilio` | `webhook` | `none`, ContentSid uyarısı)
- Firma sahibi: `POST /messaging/integration/whatsapp-bridge/test` — test bildirimi (UI: Kanal ayarları)
- Yeni/trial Twilio hesaplarında WhatsApp için çoğu zaman **`TWILIO_WHATSAPP_CONTENT_SID`** (Content Template, tek alan `{{1}}` = bildirim metni) gerekir; `Body` ile 400 `21654` alınabilir
- Sandbox: alıcı telefon `join …` mesajını Twilio sandbox numarasına göndermeli
- UI: Mesajlar → **Kanal ayarları** paneli (`MessagingChannelSettingsPanel`)

## 12B — Capacitor native shell

- Stub: `apps/web/capacitor.config.ts`
- Detay: [MESSAGING_NATIVE_SHELL_FS7.md](./MESSAGING_NATIVE_SHELL_FS7.md)
- Mağaza build için `webDir: out` + `npx cap sync`

## 12C — Partner API

- Base: `/api/v1/public/lerta-messaging/v1`
- Scope: `messaging:read`, `messaging:write`
- FS-12: `POST …/threads/{threadId}/messages/{messageId}/stamp`
- Webhook: `message.stamped` (imzalı outbound)

## 12D — Grup rolleri

- `message_thread_participants.participant_role`: `shipper` | `carrier` | `agent` | `observer`
- Grup açılışında `participantRoles` (opsiyonel); açan firma varsayılan `agent`
- `GET /messaging/threads/{threadId}/participants`

## Prod

```bash
bash scripts/apply-messaging-fs12-schema.sh
bash scripts/verify-firma-sohbeti-fs12.sh
# MP-2 sıkı teslim kanalı (Twilio+ContentSid veya webhook URL zorunlu):
API_BASE=https://app.lerta.com.tr/api/v1 MP2_WA_STRICT=1 \
  bash scripts/verify-messaging-wa-bridge-prod-mp2.sh
```

Sunucu `.env` kontrolü (uyarı): `bash scripts/verify-vps-prod-env-hints.sh`
