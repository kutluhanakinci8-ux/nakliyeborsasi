# IMAP şifresi — self-servis (webmail)

Kurumsal kutular için IMAP şifresi **yalnızca webmail self-servis** ile dağıtılır. VPS üzerindeki düz metin bootstrap dosyası **varsayılan olarak kullanılmaz**.

## Kullanıcı akışı

1. [posta.lerta.com.tr](https://posta.lerta.com.tr) → giriş (firma sahibi veya **posta yöneticisi**).
2. **Ayarlar** (⚙) → **IMAP ve SMTP**.
3. İlk kurulum: **IMAP şifresi oluştur** → şifre **bir kez** gösterilir → **Kopyala** / **Tüm bilgileri kopyala**.
4. Thunderbird / Outlook / telefon: gösterilen sunucu, kullanıcı ve şifreyi girin.
5. Şifre unutuldu veya istemci sıfırlanacak: **IMAP şifresini yenile** (onay diyaloğu) → yeni şifreyi tüm istemcilerde güncelleyin.

API her oluşturma/yenilemede Dovecot `passwd` dosyasını senkronlar (`MAIL_IMAP_APPLY_DOVECOT=true`).

## API (uygulama)

| Endpoint | Açıklama |
|----------|----------|
| `GET company/mail-inbox/imap-settings` | Sunucu, kullanıcı, `hasCredential`, `needsImapClientPassword` |
| `POST company/mail-inbox/imap-credentials/provision` | İlk şifre (yoksa) |
| `POST company/mail-inbox/imap-credentials/rotate` | Yeni şifre (mevcut geçersiz olur) |

Yetki: firma sahibi veya `MailAdmin` ([MailCompanyRoleAuthorization](../apps/api/src/modules/notification/MailCompanyRoleAuthorization.ts)).

## VPS / operasyon

| Senaryo | Komut / ayar |
|---------|----------------|
| Deploy sonrası maildir + passwd **DB’den** | `provision-pm5-imap-dovecot-vps.sh` (şifre **oluşturmaz**, varsayılan) |
| Acil tek kutu rotate (break-glass) | `bash scripts/rotate-imap-credential-vps.sh user@lerta.com.tr` |
| Eski bootstrap davranışı (önerilmez) | `MAIL_IMAP_AUTO_PROVISION_CREDENTIALS=true MAIL_IMAP_BOOTSTRAP_PLAINTEXT=true` |
| Otomatik smoke (parity test kutusu) | `ensure-imap-gold-smoke-deploy.sh` — gerekirse yalnızca test e-postasında rotate |

Bootstrap dosyası (`/root/lerta-imap-credentials-bootstrap.txt`) yalnızca `MAIL_IMAP_BOOTSTRAP_PLAINTEXT=true` ile yazılır; müşteri şifreleri için kullanmayın.

## İlgili

- [MAIL_IMAP_GOLD_SMOKE.md](./MAIL_IMAP_GOLD_SMOKE.md)
- [MAIL_PM5_IMAP_DOVECOT_RUNBOOK.md](./MAIL_PM5_IMAP_DOVECOT_RUNBOOK.md)
- [MAIL_THUNDERBIRD_IMAP.md](./MAIL_THUNDERBIRD_IMAP.md)
