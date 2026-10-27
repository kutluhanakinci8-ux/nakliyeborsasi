# Sesli mesaj — VM-1 (kayıt ve gönderim)

Asenkron sesli not (WhatsApp tarzı). Canlı WebRTC aramasından ayrıdır.

## Bayrak

- `MESSAGING_VOICE_NOTE_FAZ1=1`
- API status: `messaging_voice_note_faz1`
- Opsiyonel: `MESSAGING_VOICE_NOTE_MAX_DURATION_MS` (varsayılan 180000)

## Doğrulama

```bash
bash scripts/verify-messaging-voice-note-vm1.sh
```

## VPS

```bash
bash scripts/apply-messaging-voice-note-vps-env.sh vm1
```
