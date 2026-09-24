# Faz A — 10/10 checklist (A kaydı + PTR)

Admin panel **A5** maddeleri için operatör adımları.

## A5 — mail.lerta.tr A kaydı

**isimtescil → IP Bazlı DNS → lerta.tr**

| Tür | Host | Değer |
|-----|------|--------|
| A | `mail` | `168.231.109.27` |

- Eski **93.89.226.88** satırını silin veya güncelleyin (çift A kaydı yayını geciktirebilir).
- SPF/DKIM **TXT** satırlarına dokunmayın.

Doğrulama:

```bash
dig +short A mail.lerta.tr
# 168.231.109.27
```

Yayılma 5 dakika – 4 saat sürebilir.

## A5 — PTR (rDNS)

PTR **Hostinger** üzerinden; isimtescil’den yapılmaz.

1. hPanel → VPS (`168.231.109.27`).
2. Reverse DNS / PTR → **`mail.lerta.tr`**
3. Yoksa destek talebi (Türkçe örnek):

> Merhaba, VPS IP **168.231.109.27** için reverse DNS (PTR) kaydının **mail.lerta.tr** olmasını rica ederim. Kurumsal e-posta gönderimi (SPF/DKIM hazır) için gerekiyor.

Doğrulama:

```bash
dig +short -x 168.231.109.27
# mail.lerta.tr.
```

## Otomatik kontrol (VPS)

```bash
bash scripts/verify-mail-dns-lerta.sh
```

Admin: **Bildirimler → Platform gönderim → DNS yeniden kontrol**.
