# WebRTC Meet — Faz 20 (Native RTC köprü / Expo handoff)

**Önkoşul:** Faz 1–19.

## Özellikler

- `GET /messaging/webrtc/native-bridge/config`
- `POST /messaging/webrtc/native-bridge/handshake` → `bridgeId` (Redis, ops sayacı)
- Deep link: `nativeRtc=1` (+ isteğe bağlı `bridgeId`)
- Expo: **Meet native köprü (beta)** — handshake + web hub (`meet=1`)
- Web pilot: native köprü notu ve `bridgeId` gösterimi

Status feature: `messaging_webrtc_meet_native_rtc_faz20`  
Status: `webrtc.nativeRtcBridge`

Yerel `react-native-webrtc` modülü henüz yok; handoff tam Meet pilot web UI üzerinden.

## Sonraki (Faz 21+)

Gerçek RN WebRTC modülü veya entegre SFU medya akışı.
