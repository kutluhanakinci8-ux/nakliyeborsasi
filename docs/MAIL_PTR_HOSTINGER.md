# PTR (rDNS) — Hostinger / mail.lerta.com.tr

Gönderim itibarı için **168.231.109.27** → `mail.lerta.com.tr` PTR hizası gerekir.

## Hostinger panel

1. VPS → **IP** → **Reverse DNS (PTR)**  
2. Değer: `mail.lerta.com.tr` (veya platform MX host’unuz)  
3. Doğrulama: `dig +short -x 168.231.109.27` çıktısı `mail` içermeli  

## Kapı testi

```bash
bash scripts/verify-lerta-mail-inbound-p0.sh
```

Pilot ortamda geçici: `MAIL_INBOUND_PTR_SOFT=1` (üretim GA öncesi kapatın).
