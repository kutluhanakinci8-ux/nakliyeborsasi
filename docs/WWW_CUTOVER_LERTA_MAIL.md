# www.lerta.com.tr → Lerta Mail vitrin cutover

**Durum:** Planlama — U88 ve diğer mevcut `www` içeriği kesintisiz kalır.

## Ön koşullar

- [ ] `kurumsal.lerta.com.tr` veya staging vitrin production-ready (fiyat, kayıt, HTTPS)
- [ ] `posta` / `yonetim` / `mail` DNS ve TLS stabil
- [ ] U88 veya mevcut `www` uygulaması için **yeni host** (ör. `u88.lerta.com.tr` veya harici domain) hazır
- [ ] Müşteri / iç iletişim: `www` artık yalnızca Lerta Mail

## Cutover adımları (bakım penceresi)

1. **U88 taşıma:** PM2/nginx vhost `u88-lerta-com-tr.conf` — `www` yerine alt host’a yönlendir veya ayrı sunucu.
2. **Nginx:** `www.lerta.com.tr` + kök `lerta.com.tr` → `lerta-mail-marketing` (:3014) veya statik export.
3. **Sertifika:** `certbot -d www.lerta.com.tr -d lerta.com.tr` (mevcut posta sertifikalarına dokunma).
4. **Smoke test:** vitrin, kayıt, posta girişi, MX gönderim.
5. **Geri alma:** eski `www` vhost yedeğini `sites-available` altında sakla; 5 dk içinde `ln -sf` ile geri dön.

## Ortam

| Host | Cutover sonrası |
|------|-----------------|
| `www` / `@` | Lerta Mail marketing |
| `posta` | Webmail |
| `yonetim` | Konsol |
| `kurumsal` | İsteğe bağlı kaldırılır veya `www` ile birleştirilir |

## Riskler

- Yanlış `default_server` → Ekolojik / U88 sızıntısı (posta audit scriptini çalıştır).
- Logistics `app.lerta.com.tr` bu cutover’dan **bağımsız**; uzun vadede yalnızca `lerta.tr`.
