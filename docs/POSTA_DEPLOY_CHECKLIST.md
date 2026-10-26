# Posta (posta.lerta.com.tr) deploy kontrol listesi

## Neden “deploy ettik ama görünmüyor” olur?

1. **Kod `main`’de değil** — Feature branch’e deploy, sonra sunucu `main` ile yeniden build → eski UI (`db9f339` gibi).
2. **Tarayıcı önbelleği** — Hard refresh (`Ctrl+Shift+R`) veya gizli pencere.
3. **Yanlış sürüm hash** — Sol altta **Sürüm** = `NEXT_PUBLIC_DEPLOY_SHA` = sunucudaki `git rev-parse HEAD` kısa hali.

## Doğru akış (her posta özelliği için)

1. Feature branch’te geliştir + test.
2. **`main`’e merge** (PR veya fast-forward).
3. `git push origin main`
4. VPS: `DEPLOY_BRANCH=main bash scripts/deploy-production-vps.sh` (veya `deploy-vps-ssh.sh`)
5. Doğrula:
   - `bash scripts/verify-posta-deploy-revision.sh /var/www/nakliyeborsasi`
   - Tarayıcıda **Sürüm** = `git log -1 --oneline origin/main` ile aynı prefix

## Otomatik kontroller (deploy sonrası)

`deploy-production-vps.sh` sonunda `verify-posta-deploy-revision.sh` çalışır (başarısızsa deploy log’unda uyarı).

## Odaklanmış / Diğer sekmeleri

- Tercih: `mail_inbox_preferences.focusedInboxEnabled` (varsayılan **true**).
- Ayarlar → Posta tercihleri ile kapatılabilir.
- İstemci: son bilinen değer `localStorage` (`lerta-mail-focused-inbox-enabled`) ile ilk paint flicker önlenir.
