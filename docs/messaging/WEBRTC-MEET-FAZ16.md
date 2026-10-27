# WebRTC Meet — Faz 16 (SFU beta talebi / overflow intent)

**Önkoşul:** Faz 1–15.

## Özellikler

- Thread katılımcıları **SFU beta talebi** kaydedebilir (mesh dolu veya 4+ kişi ihtiyacı)
- `GET/POST /messaging/webrtc/threads/:threadId/overflow-intent`
- Kapasite snapshot: `sfuOverflowIntent` (path template + hint)
- Platform communications ops: `webrtcMeet.sfuOverflowIntentTotal`
- Pilot: **SFU beta talebi (4+ kişi)**; oda dolu (409) sonrası CTA

Status feature: `messaging_webrtc_meet_sfu_intent_faz16`

## Sonraki (Faz 17+)

Gerçek SFU medya sunucusu veya RN native WebRTC — `WEBRTC-MEET-ROADMAP.md`.
