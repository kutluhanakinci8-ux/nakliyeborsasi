# Mobil & PWA — ürün kararı (MP-8)

**Tarih:** 2026-09-29  
**Kapsam:** `app.lerta.com.tr` (Mesajlar hub + sohbet) · `posta.lerta.com.tr` (kurumsal posta)

## Karar: PWA-first (native mağaza yok)

| Seçenek | Durum | Not |
|---------|--------|-----|
| **PWA** (manifest + SW push) | ✅ Üretim | Hub: `manifest.webmanifest` + `messaging-push-sw.js` |
| **Posta PWA shell** | ✅ Üretim | `verify-mail-web-pwa-prod.sh` · SW `lerta-mail-shell-v7` |
| **Capacitor mağaza** | ◐ Stub only | `apps/web/capacitor.config.ts` — FS-7C; FCM/APNs ayrı faz |
| **React Native** | ✗ | Kapsam dışı (2026-09) |

Native mağaza ihtiyacı doğana kadar mobil deneyim: **ana ekrana ekle** + web push (Android / iOS 16.4+ PWA).

## Push runbook

| Ürün | Doküman |
|------|---------|
| Firma sohbeti | [MESSAGING_WEB_PUSH.md](./MESSAGING_WEB_PUSH.md) |
| iOS PWA (posta; sohbet için aynı kısıtlar) | [MAIL_WEB_PUSH_IOS.md](./MAIL_WEB_PUSH_IOS.md) |
| Capacitor yol haritası | [MESSAGING_NATIVE_SHELL_FS7.md](./MESSAGING_NATIVE_SHELL_FS7.md) |

## Doğrulama

```bash
bash scripts/verify-messaging-hub-pwa-mp8.sh
# Lighthouse ağır — VPS: SKIP_LIGHTHOUSE=1 (varsayılan operatör verify)
LIGHTHOUSE_PWA_MIN=85 SKIP_LIGHTHOUSE=0 bash scripts/verify-messaging-hub-pwa-mp8.sh
```

**Kabul:** Lighthouse PWA ≥85 (prod veya `/var/log/lerta-mail-lighthouse-pwa.json` kanıtı).
