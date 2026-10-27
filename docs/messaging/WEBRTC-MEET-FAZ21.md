# WebRTC Meet — Faz 21 (Native medya modül capabilities)

**Önkoşul:** Faz 1–20.

## Özellikler

- `GET/POST /messaging/webrtc/native-bridge/capabilities`
- `mediaModule`: `react_native_webrtc` hedefi, `rnWebRtcStatus`, `sfuMediaMode`
- Expo: otomatik capabilities raporu (native köprü açılışında)
- `EXPO_PUBLIC_RN_WEBRTC_LINKED=1` → `linked_dev_client` (dev client build)
- Web pilot: modül / SFU medya modu satırı
- Ops: `nativeRnWebRtcLinkedReports` sayacı

Status feature: `messaging_webrtc_meet_native_module_faz21`

## Sonraki (Faz 22+)

`react-native-webrtc` dev client entegrasyonu ve native mesh/SFU medya.
