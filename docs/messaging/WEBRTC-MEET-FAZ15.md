# WebRTC Meet — Faz 15 (Kapasite politikası / SFU hazırlık)

**Önkoşul:** Faz 1–14.

## Özellikler

- Merkezi kapasite snapshot: P2P mesh, **≤3** katılımcı, `sfuMode: disabled`, taşma → `reject_join`
- `GET /messaging/webrtc/capacity` ve `/messaging/webrtc/config` içinde `capacity`
- `/messaging/status` → `webrtc.capacity`, `capacityPath`
- Oda dolu (409) mesajı kapasite metniyle hizalı
- Pilot: **Mesh P2P · en fazla N kişi** notu (SFU yol haritası tooltip)

Status feature: `messaging_webrtc_meet_capacity_faz15`

## Sonraki (Faz 16+)

Gerçek SFU veya RN native WebRTC — `WEBRTC-MEET-ROADMAP.md`.
