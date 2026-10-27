# WebRTC Meet — program kapanışı (Faz 1–25)

## Kapsam

| Alan | Durum |
|------|--------|
| Web mesh görüşme | ≤3 kişi P2P, redis sinyal |
| Kayıt / arşiv / eDiscovery | Faz 4–7, 11, 14 |
| SFU | Harici signaling + embed (Faz 17–19) |
| Mobil | Expo handoff, native köprü, RN mesh pilot (Faz 13–23) |
| RN medya | `LertaRnWebRTC` + RTCView (Faz 23–24) |

## Prod doğrulama

```bash
API_BASE=https://u88.lerta.com.tr/api/v1 bash scripts/verify-messaging-webrtc-meet-faz-gate.sh
```

## Ops notları

- TURN: `docs/messaging/WEBRTC-TURN-VPS.md`
- SFU env: `docs/messaging/WEBRTC-SFU-VPS.md`
- RN dev client: `docs/messaging/WEBRTC-RN-WEBRTC-DEV-CLIENT.md`

## Sonraki ürün kararları (kod dışı)

- SFU medya sunucusu prod
- App Store dev client dağıtımı
- `react-native-webrtc` resmi bağımlılık
