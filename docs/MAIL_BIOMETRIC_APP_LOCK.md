# Webmail — Passkey ve uygulama kilidi

Outlook mobildeki **biyometri / Face ID** satırının web karşılığı: **WebAuthn passkey** + isteğe bağlı **posta kilidi**.

## Kullanıcı akışı

1. **Ayarlar → Güvenlik** — Passkey (Face ID / Touch ID / Windows Hello) kaydı.
2. Aynı ekranda **Posta kilidi** — tarayıcı oturumunda postayı tekrar açmak için biyometrik doğrulama (passkey gerekir).
3. TOTP (Authenticator) ayrı kalır; IMAP şifresi değişmez.

## API

| Yol | Açıklama |
|-----|----------|
| `GET auth/webauthn/credentials` | Kayıtlı passkey listesi |
| `POST auth/webauthn/register/options` + `verify` | Yeni passkey |
| `POST auth/webauthn/authenticate/options` + `verify` | Kilidi aç / doğrula |
| `POST auth/webauthn/credentials/:id/delete` | Passkey sil |
| `PATCH company/mail-inbox/preferences` | `mailAppLockEnabled` |

## Operatör env

```bash
WEBAUTHN_RP_ID=posta.lerta.com.tr
WEBAUTHN_ORIGINS=https://posta.lerta.com.tr
# WEBAUTHN_RP_NAME=Lerta Posta
```

## SQL

`scripts/sql/mail-webauthn-app-lock.sql` — `user_webauthn_credential`, `mail_inbox_preferences.mailAppLockEnabled`.

## Sınırlar

- Passkey kullanıcı bazlı; posta kilidi org tercihi (`mail_inbox_preferences`) — paylaşımlı kutuda tüm kullanıcılar aynı kilidi görür.
- Kilidi açma durumu `sessionStorage` ile oturum içinde tutulur; sekme kapatıldığında sıfırlanır.
