# BR-1 — Köprü ses → STT ve giden ses

- **Telegram inbound:** ses ekleri `voice_note` + otomatik STT (firma `auto` + STT-3 + BR flag)
- **Telegram outbound:** `sendVoice` (OGG/Opus sesli not)
- **WhatsApp outbound:** tek `audio/*` ek → Cloud API media upload
- **Export:** `GET /messaging/integration/voice-transcripts/export.csv`
- **Kaynak:** `transcript_source` = `bridge_inbound` | `outbound_auto` | `manual`

Flag: `MESSAGING_VOICE_BRIDGE_STT_FAZ1=1`  
Gereksinim: `MESSAGING_VOICE_TRANSCRIBE_FAZ1=1`, `MESSAGING_VOICE_TRANSCRIBE_AUTO_FAZ3=1`, STT API anahtarı.

WhatsApp **inbound** ses indirme (Graph media) sonraki iterasyon.
