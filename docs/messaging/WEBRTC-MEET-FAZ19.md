# WebRTC Meet — Faz 19 (Tarayıcı SFU gömme)

**Önkoşul:** Faz 1–18.

## Özellikler

- Join bundle `embed`: signaling iframe + yerel kamera/mikrofon önizlemesi
- `MessagingWebRtcSfuPilotEmbed` — pilot içinde gömme paneli
- Deep link: `?sfuPilot=1` (thread ile) — aktif oturum varsa panel açılır
- Mobil: `openSfuPilotMessagingHub()` → web hub + `sfuPilot=1`

Status feature: `messaging_webrtc_meet_sfu_embed_faz19`  
Status: `webrtc.sfuEmbed` (`deepLinkParam: sfuPilot`)

Mesh görüşme değişmez; tam SFU medya hâlâ harici signaling URL üzerinden.

## Sonraki (Faz 20+)

RN native WebRTC veya tek tık SFU medya köprüsü.
