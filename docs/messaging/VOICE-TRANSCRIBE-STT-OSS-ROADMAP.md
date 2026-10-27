# Ses → metin (STT) — açık kaynak / self-hosted yol haritası

OpenAI hesabı **zorunlu değil**. Mevcut ürün hattı (STT-1→3, BR-1→2, VM sesli mesaj) aynı kalır; motor katmanı faz faz **kendi VPS + ücretsiz lisanslı modeller** ile doldurulur.

## Bağımlılık zinciri (mevcut)

```
VM-1 (voice_note) → STT-1 (manuel) → STT-2 (gelişmiş) → STT-3 (otomatik)
                              ↘
                         BR-1/2 (köprü inbound ses)
```

OSS fazları **STT-1 sonrası** devreye girer; VM/BR koduna dokunmadan motor ve ops değişir.

## Lisans özeti (ürün kararı)

| Bileşen | Lisans | Not |
|---------|--------|-----|
| faster-whisper / whisper.cpp | MIT | Önerilen ana yol |
| OpenAI Whisper ağırlıkları | MIT (kullanım koşulları modele göre) | Self-host |
| Vosk | Apache 2.0 | Alternatif adapter (STT-OSS-5) |
| Mevcut Lerta API kodu | Proje lisansı | HTTP client + transcript tablosu |

SBOM / vitrin: `docs/oss/` veya mevcut lisans envanterine STT servisi satırı eklenir (STT-OSS-0).

---

## STT-OSS-0 — Karar ve envanter

**Amaç:** OpenAI’siz varsayılan strateji: “VPS içi Whisper uyumlu HTTP”.

**Teslim:**

- Bu doküman onayı
- Model boyutu kararı: `base` (hızlı) vs `small` (TR kalite)
- VPS kaynak hedefi (ör. 2 vCPU, 4 GB RAM → `small` sınırda)

**Doğrulama:** Yönetim notu; kod değişikliği yok.

---

## STT-OSS-1 — Yerel Whisper servisi (ops only)

**Amaç:** `127.0.0.1` üzerinde OpenAI `/v1/audio/transcriptions` uyumlu servis.

**Teslim:**

- `docker-compose` veya systemd unit (ör. faster-whisper + uyumlu gateway)
- Sadece localhost dinler; API Nest’ten `MESSAGING_VOICE_STT_API_URL=http://127.0.0.1:…/v1/audio/transcriptions`
- Geçici: `LERTA_MAIL_AI_COMPOSE_API_KEY=local-stt` (STT-OSS-2’de ayrılacak)
- `MESSAGING_VOICE_STT_MODEL=small` (veya `base`)
- Script: `scripts/apply-messaging-voice-stt-local-vps-env.sh`
- Script: `scripts/verify-messaging-voice-stt-local.sh` (curl ile örnek wav/ogg)

**Bayrak:** Mevcut `MESSAGING_VOICE_TRANSCRIBE_FAZ1=1` yeterli.

**Doğrulama:** `/messaging/status` → `voiceNote.sttConfigured: true` + manuel “Yazıya çevir” TR metin.

**Deploy:** merge `main` + VPS compose up + env + `pm2 restart nakliyeborsasi-api --update-env`.

---

## STT-OSS-2 — Kod: STT anahtarını Posta AI’dan ayır

**Amaç:** OpenAI / Posta compose anahtarı ile ses STT’yi birbirinden koparmak; yerel serviste auth opsiyonel.

**Teslim:**

- `MESSAGING_VOICE_STT_API_KEY` (opsiyonel Bearer)
- `messagingVoiceSttConfigured()`: URL var + (key var **veya** `MESSAGING_VOICE_STT_AUTH_OPTIONAL=1`)
- `runSpeechToText`: Authorization header yalnızca key varsa
- Status: `voiceNote.sttProvider: "local" | "openai" | "unconfigured"`
- Web uyarı metni: “STT sunucusu yapılandırılmamış” (OpenAI adı zorunlu değil)
- `docs/messaging/VOICE-TRANSCRIBE-STT1.md` güncelleme (OSS birincil, OpenAI opsiyonel)

**Bayrak (opsiyonel):** `MESSAGING_VOICE_STT_LOCAL_FAZ1=1` → feature `messaging_voice_stt_local_faz1`.

**Doğrulama:** Unit test config; verify script OSS-2.

---

## STT-OSS-3 — Türkçe kalite ve STT-2 entegrasyonu

**Amaç:** TR dil varsayılanı, glossary, confidence (mevcut STT-2) yerel motorla.

**Teslim:**

- Env: `MESSAGING_VOICE_STT_DEFAULT_LANGUAGE=tr`
- Glossary dosyası yolu (varsa): `MESSAGING_VOICE_STT_GLOSSARY_PATH`
- Load test: 30 sn voice_note → süre SLA dokümanı
- Köprü otomatik STT (STT-3 + BR) aynı motoru kullanır

**Doğrulama:** BR verify + örnek WhatsApp/Telegram ses → transcript `bridge_inbound`.

---

## STT-OSS-4 — Kapasite, kota ve güvenilirlik

**Amaç:** Üretimde CPU patlamasını önlemek.

**Teslim:**

- Mevcut `MESSAGING_VOICE_STT_MONTHLY_QUOTA` korunur
- Yeni: `MESSAGING_VOICE_STT_MAX_CONCURRENT` (yerel servis kuyruğu veya API semaphore)
- Health: `GET /messaging/integration/voice-stt/health` (local ping)
- Runbook: servis çökerse API graceful `provider: stt-error`, UI mesajı

**Doğrulama:** k6 veya basit parallel transcribe script.

---

## STT-OSS-5 — (Opsiyonel) Vosk / düşük kaynak adapter

**Amaç:** Çok düşük RAM’li VPS veya tamamen offline.

**Teslim:**

- `MessagingVoiceSttLocalVoskAdapter` veya HTTP sidecar
- `MESSAGING_VOICE_STT_PROVIDER=vosk|whisper-http`
- Ayrı lisans notu Apache 2.0

**Doğrulama:** Feature flag kapalı varsayılan; pilot firma.

---

## STT-OSS-6 — Kullanıcı rızası UX (Mesaj uygulaması)

**Amaç:** Posta webmail’e gitmeden `aiMailAssistConsent` (mesajlaşma STT + AI özet).

**Teslim:**

- `u88` / `app` → Hesap veya sohbet bildirim panelinde “AI / ses işleme rızası”
- `PATCH me/notification-preferences` (mevcut API)

**Doğrulama:** Rıza kapalı → 403; açık → transcribe 200.

---

## STT-OSS-7 — Kapanış ve parity gate

**Teslim:**

- `scripts/verify-messaging-voice-stt-oss-gate.sh` (status + local health + örnek transcript)
- QA suite’e opsiyonel gate satırı
- Müşteri hazır checklist: anahtar yok, yalnızca self-hosted

---

## Önerilen sıra (merge + deploy)

| Sıra | Faz | Kullanıcıya görünür sonuç |
|------|-----|---------------------------|
| 1 | STT-OSS-1 | “Yazıya çevir” çalışır (ücretsiz motor) |
| 2 | STT-OSS-2 | Doğru mesajlar, Posta AI’dan bağımsız |
| 3 | STT-OSS-6 | Rıza Mesaj içinden |
| 4 | STT-OSS-3 | TR kalite + köprü otomatik STT |
| 5 | STT-OSS-4 | Prod stabilite |
| 6 | STT-OSS-5 | İhtiyaç halinde Vosk |
| 7 | STT-OSS-7 | Gate kilit |

OpenAI eklemek istediğiniz gün: yalnızca `MESSAGING_VOICE_STT_API_URL` + cloud key; OSS fazlarıyla çakışmaz.

## İlgili dosyalar (bugün)

- `apps/api/src/modules/messaging/MessagingVoiceTranscribeService.ts` — HTTP STT
- `apps/api/src/modules/messaging/messagingVoiceTranscribeConfig.ts` — configured mantığı
- `apps/web/.../MessagingVoiceNoteTranscript.tsx` — kullanıcı uyarısı
- `scripts/apply-messaging-voice-stt-vps-env.sh` — bayraklar (anahtar opsiyonel OSS-2 sonrası)
