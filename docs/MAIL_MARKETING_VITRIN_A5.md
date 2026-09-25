# Lerta Mail vitrin (A5) — kurumsal kimlik

**Uygulama:** `apps/mail-marketing`

## Sayfalar

| Yol | İçerik |
|-----|--------|
| `/` | Hero, özellik kartları, güven şeridi, API fiyat planları |
| `/sss` | `src/lib/marketingFaq.ts` — faturalama, Enterprise, KVKK self-servis |
| `/kvkk` | KVKK özet (kategoriler, haklar, konsol `/privacy` linki) |
| `/sla` | Kullanılabilirlik ve destek hedefleri |
| `/iletisim` | destek@, satis@, konsol/webmail |
| `/durum` | Public status API |

## Ortam

| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | `mail-plans` için API |
| `NEXT_PUBLIC_CONSOLE_URL` | Kayıt ve SSS linkleri |
| `NEXT_PUBLIC_MAIL_WEB_URL` | Webmail giriş |

## Deploy

```bash
cd apps/mail-marketing && npm run build
# PM2/nginx — kurumsal veya www vhost
```

## www cutover (A4)

Ön kontrol: `bash scripts/preflight-www-cutover-lerta-mail.sh` — title içinde **Lerta Mail** beklenir.

Detay: [WWW_CUTOVER_LERTA_MAIL.md](./WWW_CUTOVER_LERTA_MAIL.md)

## İçerik güncelleme

- SSS maddeleri: `marketingFaq.ts`
- İletişim e-postaları: `marketingSite.ts`
- Hukuki metinler yayın öncesi hukuk onayı ile güncellenir (`LEGAL_DISCLAIMER`).
