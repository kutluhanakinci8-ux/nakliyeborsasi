# Sesli mesaj — VM-3 (mobil / Expo)

- `expo-av` ile yerel kayıt ve API üzerinden `voice_note` gönderimi
- Expo push: sesli mesaj başlığı + `voiceNote=1` deep link (web vurgusu: VM-4)
- Mobil panel: `MessagingVoiceNoteMobilePanel` (thread UUID + kayıt)

## Bayraklar

- `MESSAGING_VOICE_NOTE_FAZ1=1` (gönderim)
- `MESSAGING_VOICE_NOTE_MOBILE_FAZ3=1`
- Status: `messaging_voice_note_mobile_faz3`, `voiceNote.mobileFaz3Enabled`

## VPS

```bash
bash scripts/apply-messaging-voice-note-vps-env.sh vm3
```

## Doğrulama

```bash
bash scripts/verify-messaging-voice-note-vm3.sh
```
