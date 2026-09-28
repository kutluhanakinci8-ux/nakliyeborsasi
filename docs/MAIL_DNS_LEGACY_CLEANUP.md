# DNS legacy temizlik (kullanici.* vb.)

## Amaç

Eski pilot kayıtları (`kullanici.lerta.com.tr`, `user.*` CNAME) müşteri karışıklığı yaratır. Üretim vitrin:

| Host | Hedef |
|------|--------|
| `posta.lerta.com.tr` | Webmail (PWA) |
| `yonetim.lerta.com.tr` | Konsol + API |
| `mail.lerta.com.tr` | IMAP/SMTP MX |
| `kurumsal.lerta.com.tr` | Vitrin |

## Doğrulama

```bash
./scripts/verify-dns-legacy-cleanup.sh lerta.com.tr
```

## Temizlik adımları

1. DNS panelinde `kullanici.*` A/CNAME kayıtlarını kaldırın veya `301` ile `posta.lerta.com.tr` yönlendirin.
2. `dig +short kullanici.lerta.com.tr` boş olmalı.
3. VPS nginx: eski vhost dosyalarını `sites-disabled` altına taşıyın.
