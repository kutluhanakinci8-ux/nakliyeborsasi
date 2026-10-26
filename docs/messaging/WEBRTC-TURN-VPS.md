# WebRTC — ICE / TURN (VPS)

Pilot görüntülü arama (`messaging/webrtc/*`) için API, tarayıcıya ICE sunucu listesi döner. Varsayılan: Google STUN (`stun:stun.l.google.com:19302`). Üretimde NAT arkasındaki istemciler için **TURN** eklenmelidir.

## Ortam değişkeni

`MESSAGING_WEBRTC_ICE_SERVERS` — **tek satır JSON dizisi** (API `.env`):

```bash
MESSAGING_WEBRTC_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:turn.example.com:3478","username":"lerta","credential":"SECRET"}]
```

- `urls` string veya string dizisi olabilir (WebRTC `RTCIceServer` ile uyumlu).
- TURN kullanıcı adı/parolası coturn veya managed TURN sağlayıcıdan gelir; repoya yazmayın.

## Redis

SDP/ICE relay için `REDIS_URL` zorunlu. `messaging/status` → `webrtc.signaling: redis_relay` görünmüyorsa relay kapalıdır.

## VPS kurulum

```bash
# İlk kez: varsayılan STUN satırını .env'e yaz (TURN'ü sonra elle güncelleyin)
bash scripts/apply-messaging-webrtc-ice-vps-env.sh /var/www/nakliyeborsasi
```

Deploy (`deploy-production-vps.sh`) bu script'i otomatik dener.

## Doğrulama

1. `curl -s https://api.lerta.com.tr/api/v1/messaging/status | jq .webrtc`
2. Hub → sohbet seç → **Pilot görüntülü arama** (iki tarayıcı / iki firma hesabı, aynı thread).
3. **Safari:** Kamera/mikrofon yalnızca düğmeye bastığınızda istenir; gelen aramada **Gelen aramayı kabul et** gerekir. Adres çubuğundan site izinlerini açın.
4. TURN testi: coturn loglarında `ALLOCATE` veya managed TURN paneli.

## Güvenlik

- TURN credential'ları düzenli yenileyin.
- Relay yalnızca thread katılımcılarına açık (JWT + `assertThreadParticipantForSignaling`).
