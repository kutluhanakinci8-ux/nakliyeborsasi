# E-posta platformu — A → B → C yürütme

Ürün kodu ve taşıma hattı bu repoda; harici ESP/Gmail API kullanılmaz.

## Faz A — Platform bildirimleri (şimdi)

**Hedef:** Kayıt, giriş, ihale, teklif, mesaj vb. `notifications@mail.lerta.tr` ile gider.

| Adım | Nerede |
|------|--------|
| VPS Postfix + OpenDKIM | `bash scripts/setup-postfix-phase-a-lerta.sh` |
| `.env` üretim SMTP | `bash scripts/vps-enable-production-smtp.sh` |
| DNS (isimtescil) | [EMAIL_PHASE_A_DNS_ISIMTESCIL.md](EMAIL_PHASE_A_DNS_ISIMTESCIL.md) |
| Checklist + test | Admin → Bildirimler → **Platform gönderim** / **Operasyon** |
| Yol haritası | Admin → Bildirimler → **Yol haritası** |

Kod: `PlatformMailSendingService`, `EmailOutboxService`, `NotificationConfigurationService` (`mailpit` \| `custom`).

## Faz B — Kurumsal gönderen kimliği (sonra)

**Hedef:** Organizasyon için doğrulanmış domain/alt alan; outbox `From` varsayılan kimlikten (`metadata.companyId`).

| Adım | Nerede |
|------|--------|
| Domain kaydı | Admin → **Kurumsal kimlik (B)** |
| DNS doğrulama | Manuel «verified» (otomatik DNS kontrolü sonraki iterasyon) |
| Varsayılan gönderen | Domain altında sender identity + `isDefault` |
| Çözümleme | `MailSenderResolutionService` |

Tablolar: `mail_domains`, `mail_sender_identities`. API: `GET/POST platform-admin/mail/*`.

## Faz C — Tam posta kutusu (en son)

**Hedef:** Gelen + giden, panel webmail, isteğe bağlı IMAP.

Stub entity: `mail_mailboxes`, `mail_inbound_messages`. MX + MIME depolama + UI henüz planlı.

## Deploy

Branch: `cursor/own-mail-platform-519e`. Push → GitHub Actions `Deploy VPS` veya `bash scripts/deploy-vps-ssh.sh`.
