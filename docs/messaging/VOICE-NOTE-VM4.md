# Sesli mesaj — VM-4 (deep link / push → web mikrofon)

Mobil Expo push ve `buildMeetHubUrl({ voiceNote: true })` ile gelen `voiceNote=1` sorgu parametresi web sohbette mikrofon düğmesini vurgular.

## Bayraklar

- `MESSAGING_VOICE_NOTE_FAZ1=1`
- `MESSAGING_VOICE_NOTE_DEEPLINK_FAZ4=1`
- Status: `messaging_voice_note_deeplink_faz4`, `voiceNote.deeplinkFaz4Enabled`

## VPS

```bash
bash scripts/apply-messaging-voice-note-vps-env.sh vm4
```

## Doğrulama

```bash
bash scripts/verify-messaging-voice-note-vm4.sh
```

Örnek URL: `/messaging?tab=chat&threadId=<uuid>&voiceNote=1`
