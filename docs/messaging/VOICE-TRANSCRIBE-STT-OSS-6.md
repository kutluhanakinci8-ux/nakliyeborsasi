# STT-OSS-6 — Mesaj uygulamasında AI / ses rızası

Kullanıcı `aiMailAssistConsent` tercihini Posta’ya gitmeden yönetir (API: `PATCH /me/notification-preferences`).

## UI

- Sohbet: `MessagingAiProcessingConsentCard` (kompakt şerit, transkripsiyon açıkken)
- Hub bildirim paneli: tam kart
- Hesap → Profil: **02c · Gizlilik**

## Doğrulama

```bash
bash scripts/verify-messaging-voice-stt-oss6.sh
```
