# Web Push — iOS / Safari kısıtları (G7)

Lerta Posta web push’u standart **Web Push API** + **service worker** kullanır ([MAIL_WEB_PUSH.md](./MAIL_WEB_PUSH.md)). Apple platformlarında davranış masaüstü Chrome/Firefox’tan farklıdır; destek ve pilot beklentilerini burada topluyoruz.

## Özet

| Ortam | Push (yeni posta) | Not |
|-------|-------------------|-----|
| Chrome / Edge / Firefox (masaüstü) | ✓ (izin + VAPID) | Önerilen pilot yolu |
| Android Chrome (PWA veya sekme) | ✓ (genelde) | “Ana ekrana ekle” isteğe bağlı |
| iOS Safari (sekme) | ✗ | Web Push sekmede yok |
| iOS 16.4+ PWA (Ana ekrana ekle) | ✓ (kısıtlı) | Sadece **eklenmiş** web uygulaması |
| macOS Safari 17+ | ✓ (kısıtlı) | İzin ve bildirim merkezi |

## iOS için kullanıcı adımları

1. **https://posta.lerta.com.tr/mail** adresini Safari’de açın (HTTP “Güvenli değil” gösterir; push ve PWA için HTTPS şart).
2. Paylaş → **Ana Ekrana Ekle**.
3. Uygulamayı ana ekrandan açın (Safari sekmesi değil).
4. Ayarlar → **Bildirim** → Bildirimleri aç; iOS sistem iznini onaylayın.

Push gelmezse:

- iOS **Ayarlar → Bildirimler** altında “Lerta Posta” / site adının açık olduğunu kontrol edin.
- Düşük güç modu ve Odak modları bildirimi geciktirebilir.
- Aboneliği kapatıp tekrar açın (Ayarlar → Bildirim).

## Teknik kısıtlar

- **VAPID** anahtarları sunucuda tanımlı olmalı (`apply-mail-web-push-vps-env.sh`).
- Service worker önbellek sürümü güncellendiğinde kullanıcılar bir kez sayfayı yenilemeli (sidebar **Sürüm** SHA ile deploy doğrulanır).
- iOS PWA arka planda agresif askıya alınır; **snooze süresi bitince** push tetiklenir (`MailSnoozeWakeProcessor`) ancak gecikme olabilir.
- Sesli bildirim: iOS web push’ta özelleştirilmiş ses desteği sınırlı; webmail’deki isteğe bağlı ses çoğunlukla **sekme açıkken** çalışır.

## Operasyon

- Pilot kullanıcıya **masaüstü Chrome** veya **iOS PWA** rehberi verin; “Safari sekmesinde beklemeyin” mesajı net olsun.
- Kalıcı sorunlarda: tarayıcı bildirim izni, `GET push-config` → `enabled: true`, API loglarında `web-push` hataları.

## İlgili

- [MAIL_WEB_PUSH.md](./MAIL_WEB_PUSH.md) — VAPID, API, VPS
- [MAIL_WEBMAIL_UX_ROADMAP.md](./MAIL_WEBMAIL_UX_ROADMAP.md) — G6/G7
