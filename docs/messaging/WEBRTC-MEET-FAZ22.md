# WebRTC Meet — Faz 22 (RN native mesh pilot oturumu)

**Önkoşul:** Faz 1–21, `linked_dev_client` capabilities.

## Özellikler

- `GET/POST …/threads/:threadId/native-pilot/session`
- Oturum: `pilotSessionId`, `joinToken`, ICE listesi, `native_mesh_pilot`
- `mediaModule.nativeMeshPilot` metadata
- Expo: `NativeMeetMeshPilotPanel` (env linked ise)
- Web: deep link `nativePilot=1`, pilot butonu (dev client capabilities)
- Ops: `nativeMeshPilotSessions`

Status feature: `messaging_webrtc_meet_rn_webrtc_pilot_faz22`

Kurulum: `WEBRTC-RN-WEBRTC-DEV-CLIENT.md`

## Sonraki (Faz 23+)

Gerçek RN `RTCPeerConnection` mesh bağlantısı (sinyal tüketimi).
