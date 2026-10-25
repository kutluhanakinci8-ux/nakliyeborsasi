# Lerta Posta — platform yöneticisi `info@lerta.com.tr`

## Üç farklı “e-posta” kavramı

| Kavram | Örnek (eski) | Örnek (kurumsal hedef) |
|--------|----------------|-------------------------|
| **Giriş e-postası** (`user_accounts`) | `a.kutluhan@msn.com` | `info@lerta.com.tr` |
| **Posta kutusu** (`mail_mailbox`) | `kutluhan@kullanici.lerta.com.tr` | `info@lerta.com.tr` |
| **Platform operatör** (`/admin`, `platform-admin` API) | `admin@lerta.tr` (kod varsayılanı) | `.env` ile `info@lerta.com.tr` eklenebilir |

`posta.lerta.com.tr/login` **giriş e-postası** ile çalışır; MSN ile kayıt olduysanız kutu adresi farklı kalır. Kurumsal görünüm için **giriş + varsayılan kutu** `info@lerta.com.tr` olmalı.

## Kim ne yapar?

- **Siz (VPS / operatör):** Kutu, gönderen kimliği, kullanıcı giriş e-postası, `.env` operatör listesi — script ile.
- **Müşteri:** Azure/Google bağlama, kendi `info@firma.com` kutuları — sizin bu adımınızdan sonra.

## VPS adımları

```bash
cd /var/www/nakliyeborsasi
git pull   # script geldiyse

export OLD_LOGIN_EMAIL='a.kutluhan@msn.com'   # mevcut posta girişi
export ADMIN_MAILBOX='info@lerta.com.tr'
export ADMIN_DISPLAY_NAME='Lerta Platform'
# İsteğe bağlı: kutunun bağlı olacağı org (yoksa giriş kullanıcısının firması)
# export TARGET_ORG_ID='6949c70a-eed6-47c7-8fca-6f41e1344377'

bash scripts/align-lerta-posta-admin-info-email.sh
bash scripts/restart-api.sh
```

Script sonrası:

1. `https://posta.lerta.com.tr/login` → **info@lerta.com.tr** + mevcut şifre (giriş e-postası güncellenir, şifre aynı kalır).
2. IMAP şifresi dosyada: `/root/lerta-imap-credentials-bootstrap.txt` (yenilendiyse).
3. `bash scripts/verify-uat-oauth-env.sh .env` — OAuth henüz opsiyonel.

## Yönetim konsolu

`yonetim.lerta.com.tr` aynı API kullanıcısıdır; giriş e-postası `info@lerta.com.tr` olunca konsol da bu hesapla açılır (rol: CompanyOwner / MailAdmin).

Platform **süper operatör** (`admin@lerta.tr`) ayrı kalabilir; script `.env` içine `PLATFORM_OPERATOR_EMAILS` ve `PLATFORM_ADMIN_EMAILS` ekler.

## Çakışma

`info@lerta.com.tr` başka bir firmaya atanmışsa script durur. Çözüm: platform admin org’unu netleştirin veya `TARGET_ORG_ID` ile doğru firmayı verin.
