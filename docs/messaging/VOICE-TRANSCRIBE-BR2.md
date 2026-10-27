# BR-2 — WhatsApp inbound ses → voice_note + köprü STT

WhatsApp Cloud webhook’unda `type: audio` (sesli not) mesajları için Graph API ile medya indirilir, mesaj ekine `voice_note` olarak yazılır ve BR-1 ile aynı `maybeAutoTranscribeBridgeInbound` hattı çalışır.

## Gereksinimler

- `MESSAGING_VOICE_BRIDGE_STT_FAZ1=1` (BR-1)
- `MESSAGING_VOICE_BRIDGE_WA_INBOUND_FAZ2=1` (BR-2)
- STT-1/3 ve firma `voice_transcribe_mode=auto` + KVKK onayı (BR-1 ile aynı)

## Teknik

- Parser: `extractWhatsAppInboundAudio` → `whatsAppInboundAudio.mediaId`
- İndirme: `SocialHubMetaGraphService.downloadWhatsAppMedia`
- Ingest: `SocialHubWebhookIngestService.resolveWhatsAppInboundAudioAttachments`

VPS env: `scripts/apply-messaging-voice-bridge-wa-inbound-vps-env.sh`
