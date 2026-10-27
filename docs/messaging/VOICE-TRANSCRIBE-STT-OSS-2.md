# STT-OSS-2 — STT anahtarı Posta AI’dan ayrıldı

- `MESSAGING_VOICE_STT_API_KEY` — ses STT Bearer (yerel: `local-stt-internal`)
- `MESSAGING_VOICE_STT_AUTH_OPTIONAL=1` — loopback servis auth istemez
- Status: `voiceNote.sttProvider` = `local` | `openai` | `unconfigured`
- Feature: `messaging_voice_stt_local_faz1`

```bash
bash scripts/apply-messaging-voice-stt-local-vps-env.sh
pm2 restart nakliyeborsasi-api --update-env
bash scripts/verify-messaging-voice-stt-oss2.sh
```
