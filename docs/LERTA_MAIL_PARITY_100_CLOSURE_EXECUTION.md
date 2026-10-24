# Lerta Mail — %100 parite kapanış yürütme planı

**Amaç:** [MAIL_PRELAUNCH_COMPETITIVE_GATE_2026-10-24.md](./MAIL_PRELAUNCH_COMPETITIVE_GATE_2026-10-24.md) eksiklerini kod + prod kanıt ile kapatmak.

## Faz A — Bu sprint (kod)

| Madde | Durum |
|-------|--------|
| IMAP maildir reconcile cron (`MailImapMaildirReconcileScheduler`) | ✅ |
| AI odaklı kutu arka plan sınıflandırma (`MailInboxAiFocusScheduler`) | ✅ |
| Bounce intelligence + domain kırılımı (`getBounceIntelligence`) | ✅ |
| Kampanya blok editörü (drag sıra + HTML) | ✅ |
| A/B gönderim istatistikleri (`abStats`) | ✅ |
| Yanıt alıntısı WYSIWYG önizleme | ✅ |
| PWA doğrulama script v7+ | ✅ |
| Capacitor build script | ✅ |
| PTR runbook + pilot soft flag | ✅ |
| Billing pilot `MAIL_BILLING_PILOT_FREE=1` | ✅ |

## Faz B — Prod (VPS / panel)

| Madde | Aksiyon |
|-------|---------|
| PTR | [MAIL_PTR_HOSTINGER.md](./MAIL_PTR_HOSTINGER.md) |
| Graph/Google OAuth | VPS `.env` + redirect URI |
| M1 IMAP gold | `bash scripts/smoke-imap-gold.sh` |
| M9 teslimat | [EMAIL_PILOT_LERTA_COM_TR.md](./EMAIL_PILOT_LERTA_COM_TR.md) |
| Native mağaza | `bash scripts/build-posta-capacitor-native.sh` + store beta |

## Faz C — Bilinçli %100 dışı (ürün kararı)

| Rakip özelliği | Neden ayrı ürün |
|----------------|-----------------|
| Proton varsayılan E2E | Hukuki + kripto mimari; isteğe bağlı PGP/S-MIME mevcut |
| Slack kanal/huddle | B2B iş thread odağı |
| Tam JMAP sunucu | Köprü + IMAP gold |

## Kapı komutu

```bash
bash scripts/run-mail-messaging-parity-close-checklist.sh && bash scripts/run-mail-messaging-parity-wave2-checklist.sh
```
