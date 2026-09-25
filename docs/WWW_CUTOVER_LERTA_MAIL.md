# www.lerta.com.tr → Lerta Mail vitrin cutover

**Durum:** Planlama — U88 ve diğer mevcut `www` içeriği kesintisiz kalır.

## Ön koşullar

- [x] `kurumsal.lerta.com.tr` vitrin (fiyat, kayıt, HTTPS) — canlı
- [ ] `posta` / `yonetim` / `mail` DNS ve TLS stabil
- [ ] U88 için **yeni host** `u88.lerta.com.tr` DNS A kaydı + nginx
- [ ] Müşteri / iç iletişim: `www` artık yalnızca Lerta Mail

## Preflight (değişiklik yapmaz)

```bash
bash scripts/preflight-www-cutover-lerta-mail.sh
```

Kurumsal vitrin smoke:

```bash
BASE_URL=https://kurumsal.lerta.com.tr bash scripts/smoke-www-cutover-lerta-mail.sh
```

## Cutover adımları (bakım penceresi)

1. **U88 taşıma**
   - DNS: `u88.lerta.com.tr` A → VPS IP (`168.231.109.27`)
   - `sudo bash scripts/nginx-u88-lerta-com-tr.sh` (varsayılan `:3011` — `WEB_PORT` ile değiştirin)
   - Eski `www` vhost yedeği alınır (`apply` scripti de yedekler)

2. **DNS www:** `www.lerta.com.tr` ve `lerta.com.tr` A → aynı VPS (preflight OK)

3. **Cutover (root):**
   ```bash
   cd /var/www/nakliyeborsasi
   git pull
   CONFIRM_CUTOVER=yes bash scripts/apply-www-cutover-lerta-mail.sh
   ```
   - `restart-mail-marketing.sh` + `nginx-www-lerta-mail-marketing.sh`
   - Varsayılan: `kurumsal` → `www` 301 (`REDIRECT_KURUMSAL=no` ile kapatılır)

4. **Smoke:** `https://www.lerta.com.tr` — script otomatik; manuel:
   ```bash
   bash scripts/smoke-www-cutover-lerta-mail.sh
   ```

5. **Geri alma:** `/etc/nginx/sites-available/backups-lerta-mail-cutover/` içindeki `.bak` dosyalarını `sites-enabled`'a geri `ln -sf`

## Ortam

| Host | Cutover sonrası |
|------|-----------------|
| `www` / `@` | Lerta Mail marketing (:3014) |
| `u88` | Eski www / U88 programı (:3011) |
| `posta` | Webmail |
| `yonetim` | Konsol |
| `kurumsal` | 301 → `www` (isteğe bağlı) |

## Riskler

- Yanlış `default_server` → Ekolojik / U88 sızıntısı (`scripts/audit-nginx-posta-isolation.sh`)
- Logistics `app.lerta.com.tr` bu cutover’dan **bağımsız**

## Script referansı

| Script | Açıklama |
|--------|----------|
| `preflight-www-cutover-lerta-mail.sh` | DNS + title + kurumsal smoke |
| `nginx-u88-lerta-com-tr.sh` | U88 yeni host |
| `nginx-www-lerta-mail-marketing.sh` | www/apex → marketing |
| `nginx-kurumsal-redirect-to-www.sh` | kurumsal 301 |
| `apply-www-cutover-lerta-mail.sh` | Tek komut cutover |
| `smoke-www-cutover-lerta-mail.sh` | Vitrin doğrulama |
