# WebRTC SFU — VPS yapılandırma (Faz 17 hazırlık)

Faz 17 **medya yönlendirmesini açmaz**; yalnızca SFU altyapısının tanımlanması ve HTTP sağlık kontrolü yapılır. Görüşmeler mesh P2P (≤3 kişi) olarak kalır.

## Ortam değişkenleri (API `.env`)

| Değişken | Açıklama |
|----------|----------|
| `MESSAGING_WEBRTC_SFU_HEALTH_URL` | SFU veya yönetim düzleminin `GET` sağlık URL’si (ör. `http://127.0.0.1:7880/health`) |
| `MESSAGING_WEBRTC_SFU_SIGNALING_URL` | Gelecek faz için WebSocket/HTTP signaling (henüz kullanılmıyor) |
| `MESSAGING_WEBRTC_SFU_PLANNED_MAX_PARTICIPANTS` | Planlanan üst sınır (varsayılan 12) |

Deploy sonrası: `GET /api/v1/messaging/webrtc/sfu/status` veya `/messaging/status` → `webrtc.sfuBackend`.

## Sonraki

Faz 18+ gerçek SFU join/signaling entegrasyonu.
