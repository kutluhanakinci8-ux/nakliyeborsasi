# Kurumsal e-posta entegrasyon — faz planı (Mesajlar sonrası)

| Faz | Kapsam | Deploy |
|-----|--------|--------|
| **E-P0** | Platform DNS durumu UI, Reply-To → kurumsal kutu | ✅ kod |
| **E-P1** | Embed marka (sürüm/çıkış gizle), SSO origin env, tema postMessage | ✅ kod |
| **E-P2** | IMAP Sent Maildir, billing suspend otomasyon, tam white-label başlık | ✅ kod |
| **E-P3** | JMAP köprüsü (`Email/query`, `Email/get`), platform mail eDiscovery export, gelen kutusu gönderim/silme audit | ✅ kod |

**Operatör DNS:** `bash scripts/print-instant-post-dns-isimtescil.sh` · doğrulama: `scripts/verify-lerta-post-dns.sh`

**Env:** `MAIL_REPLY_TO_ORGANIZATION_MAILBOX=false` ile eski platform Reply-To; `NEXT_PUBLIC_LERTA_APP_ORIGINS` (web + mail-web consume)
