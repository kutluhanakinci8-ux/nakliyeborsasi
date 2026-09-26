# Thunderbird / Outlook — IMAP kurulumu (G8)

Kurumsal kutu: **webmail** (`https://posta.lerta.com.tr/mail`) + isteğe bağlı **IMAP** (Dovecot + Maildir).

## Ön koşullar

- Org için aktif kurumsal adres (ör. `siz@firma.lerta.com.tr`)
- Firma sahibi veya yetkili: webmail **Ayarlar → IMAP → IMAP şifresi oluştur / yenile**
- VPS’te Dovecot kurulu (`scripts/setup-dovecot-c4.sh`, `MAIL_IMAP_*` env)

## Sunucu bilgileri

| Alan | Değer |
|------|--------|
| IMAP sunucu | `MAIL_IMAP_HOST` (varsayılan `mail.lerta.tr`) |
| Port | `993` |
| Güvenlik | SSL/TLS |
| Kullanıcı adı | Tam e-posta adresiniz |
| Şifre | Webmail’de **bir kez** gösterilen IMAP şifresi |

Ayarlar ekranındaki değerler API `GET company/mail-inbox/imap-settings` ile aynıdır.

## Thunderbird (özet)

1. Hesap Ekle → E-posta
2. Adres ve şifre → **Manuel yapılandırma**
3. Gelen: **IMAP**, sunucu/port/SSL yukarıdaki tablo
4. Giden (SMTP): org politikanıza göre — çoğu pilot kurulumda `mail.lerta.tr`, port **587** (STARTTLS) veya **465** (SSL), kullanıcı = e-posta, şifre = IMAP şifresi. Gönderim çalışmazsa webmail kullanın veya yöneticiye başvurun.
5. Klasörler: Gelen, **Arşiv** ve **Çöp** webmail ile senkron (API Maildir taşıma).

## Outlook (Windows / Mac)

- Hesap türü: **IMAP**
- Gelen ve giden sunucu alanlarını Thunderbird ile aynı doldurun.

## Güvenlik

- IMAP şifresi web arayüzünde tekrar gösterilmez; kaybettiyseniz **yenile** (eski şifre geçersiz olur).
- Şifreyi paylaşmayın; ekip üyeleri kendi hesapları veya alias politikası ile çalışmalıdır.
- 2FA: webmail girişinde TOTP açıksa IMAP şifresi ayrı kalır (uygulama şifresi mantığı).

## Sınırlamalar (bilinçli)

- Gönderilen öğeler öncelikle webmail/compose API’de; IMAP **Sent** klasörü her ortamda dolu olmayabilir ([EMAIL_REMAINING_WORK_PLAN.md](./EMAIL_REMAINING_WORK_PLAN.md)).
- Takvim/kişiler **D6** kapsamında değil (harici CalDAV sonra).

## Webmail içi rehber

Kullanıcılar: `https://posta.lerta.com.tr/help/imap`

## İlgili

- [EMAIL_FAZ_C_C4_MIME_IMAP_RSPAMD.md](./EMAIL_FAZ_C_C4_MIME_IMAP_RSPAMD.md) — operatör kurulum
- [MAIL_WEB_PUSH_IOS.md](./MAIL_WEB_PUSH_IOS.md) — mobil bildirim (PWA)
