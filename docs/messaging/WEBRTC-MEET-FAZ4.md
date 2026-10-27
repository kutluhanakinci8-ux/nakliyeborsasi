# WebRTC Meet — Faz 4 (Operasyon)

**Önkoşul:** Faz 1–3 feature bayrakları.

## Özellikler

- **Planlı görüşme** — thread bazlı Redis kaydı (`PUT/GET/DELETE …/schedule`), ICS indirme
- **Yerel kayıt** — görüşme sırasında tarayıcıda `MediaRecorder` (yalnızca cihaza `.webm` indirilir; sunucuya yükleme yok)
- **TURN / ICE kapasite özeti** — `config` ve `messaging/status` → `webrtc.iceCaps` (STUN/TURN sayıları, credential var mı)

Status feature: `messaging_webrtc_meet_ops_faz4`

## API

- `GET /messaging/webrtc/threads/:threadId/schedule`
- `PUT /messaging/webrtc/threads/:threadId/schedule` — body: `scheduledAt` (ISO), `media`, `note?`
- `DELETE /messaging/webrtc/threads/:threadId/schedule`

## Sonraki (Faz 5)

Bkz. `WEBRTC-MEET-FAZ5.md` — push hatırlatma, kayıt arşivi, TURN izleme.
