# WebRTC Meet — Faz 24 (RTCView + arka plan)

**Önkoşul:** Faz 23, `LertaRnWebRTC` + `RTCView`.

## Özellikler

- Uzak video: `ontrack` → `stream.toURL()` → `NativeMeetRemoteRtcView`
- Arka plan: `AppState` ile sinyal poll duraklatma
- Bootstrap örneği: `apps/mobile/lertaRnWebRtcBootstrap.example.js`
- CI: `scripts/verify-messaging-webrtc-dev-client-ci.sh`

Status feature: `messaging_webrtc_meet_rn_rtc_view_faz24`
