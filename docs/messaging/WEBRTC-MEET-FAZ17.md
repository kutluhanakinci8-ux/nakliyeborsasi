# WebRTC Meet — Faz 17 (SFU yapılandırma + sağlık)

**Önkoşul:** Faz 1–16.

## Özellikler

- SFU backend snapshot: `meshOnly: true` (medya hâlâ P2P mesh)
- Opsiyonel `MESSAGING_WEBRTC_SFU_HEALTH_URL` HTTP probe
- `GET /messaging/webrtc/sfu/status`, config ve `/messaging/status` → `webrtc.sfuBackend`
- Pilot: SFU altyapı durumu satırı
- Ops snapshot: `webrtcMeet.sfuBackend`

Status feature: `messaging_webrtc_meet_sfu_config_faz17`

VPS: `docs/messaging/WEBRTC-SFU-VPS.md`

## Sonraki

Faz 18 SFU oturum API — `WEBRTC-MEET-FAZ18.md`.
