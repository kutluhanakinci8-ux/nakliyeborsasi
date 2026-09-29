# Firma sohbeti — erişilebilirlik (MP-7)

**Kapsam:** `/messaging` hub (şerit, thread listesi, compose) · axe **kritik 0**

## Otomatik doğrulama

```bash
# Prod login (varsayılan URL)
bash scripts/verify-axe-messaging.sh

# Özel URL (lokal web)
MESSAGING_AXE_URL='http://127.0.0.1:3011/login?next=%2Fmessaging%3Ftab%3Dsohbet' \
  bash scripts/verify-messaging-a11y-mp7.sh
```

VPS operatör verify: `SKIP_AXE=1` (Chromium ağır). CI veya geliştirme makinesinde `SKIP_AXE=0`.

## Manuel

- Klavye: Tab ile şerit → liste → compose; Escape arama panelini kapatır.
- Ekran okuyucu: şerit `role="navigation"` + görünüm `tablist`; liste `aria-current`; compose `aria-label`.

## Kontrast

Premium zemin temaları (`data-chat-bg`) için boş durum ve balon meta renkleri `globals.css` içinde MP-7 bloğu.
