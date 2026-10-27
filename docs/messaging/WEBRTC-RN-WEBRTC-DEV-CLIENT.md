# react-native-webrtc — dev client (Faz 22)

## Kurulum (özet)

1. Expo **dev client** build (managed workflow’da `react-native-webrtc` yok).
2. `npx expo install react-native-webrtc` + config plugin / prebuild.
3. `.env`: `EXPO_PUBLIC_RN_WEBRTC_LINKED=1`
4. Uygulamada capabilities POST → `linked_dev_client`.
5. Thread için `POST /messaging/webrtc/threads/:threadId/native-pilot/session`.

Pilot oturum: `joinToken`, `iceServers`, `redis_relay` sinyal (mesh ≤3).

## Faz 23 — global enjeksiyon

`index.js` veya root bileşende:

```javascript
import { RTCPeerConnection, mediaDevices } from "react-native-webrtc";
global.LertaRnWebRTC = { RTCPeerConnection, RTCView, mediaDevices };
```

Expo uygulamasında **Native mesh (sinyal + medya)** thread ID ile odaya katılır; offer/answer/ICE redis relay üzerinden gider.
