# PTR (rDNS) — Hostinger / mail.lerta.com.tr

## PTR nedir? (SSH ile yapılmaz)

| Kavram | Ne işe yarar | Nerede ayarlanır |
|--------|----------------|------------------|
| **A kaydı** | `mail.lerta.com.tr` → `168.231.109.27` | Domain DNS (isimtescil vb.) |
| **PTR (rDNS)** | `168.231.109.27` → `mail.lerta.com.tr` | **Sadece Hostinger** (IP sahibi) |

`ssh root@168.231.109.27` ile sunucuya girince PTR **değişmez**. Postfix/nginx ayarı da PTR oluşturmaz. Hostinger panelinde veya Hostinger API token ile yapılır.

Gmail/Outlook/MSN gönderiminde PTR uyumsuzluğu junk/spam riskini artırır (M9).

---

## Ön koşul (zaten sağlanmalı)

```bash
dig +short mail.lerta.com.tr A
# 168.231.109.27
```

Hostinger, A kaydı yoksa PTR kaydını **reddeder**.

---

## Yöntem A — hPanel (sizin tıklamanız gerekir)

1. [https://hpanel.hostinger.com](https://hpanel.hostinger.com) → giriş (VPS SSH şifresi **değil**, Hostinger hesap şifresi).
2. **VPS** → sunucunuzu seçin (`srv1828484` / IP `168.231.109.27`).
3. **Settings** (Ayarlar) → **IP address** sekmesi.
4. IPv4 yanında **Set PTR record** (PTR kaydı ayarla).
5. Alan adı: **`mail.lerta.com.tr`** (sonunda nokta olmadan) → **Save**.
6. 15 dk – 24 saat sonra kontrol:

```bash
dig +short -x 168.231.109.27
# mail.lerta.com.tr. veya içinde "mail" geçen hostname
```

Kaynak: [Hostinger — How to setup reverse DNS on VPS](https://www.hostinger.com/support/4805528-how-to-setup-reverse-dns-on-vps/)

---

## Yöntem B — API (agent / otomasyon)

1. hPanel → **VPS** → **API** → token oluştur.
2. VM ve IP address ID’leri:

```bash
export HOSTINGER_API_TOKEN='...'
bash scripts/hostinger-set-ptr-mail-lerta.sh
# İlk koşu ID listesi verir; sonra:
export HOSTINGER_VM_ID='...'
export HOSTINGER_IP_ADDRESS_ID='...'
bash scripts/hostinger-set-ptr-mail-lerta.sh
```

---

## Doğrulama (repo)

```bash
bash scripts/verify-ptr-mail-lerta.sh
bash scripts/verify-lerta-mail-inbound-p0.sh
```

Pilot geçici: `MAIL_INBOUND_PTR_SOFT=1` (GA öncesi kapatın).

---

## VPS hostname (isteğe bağlı, PTR değildir)

Sunucu içi görünen ad (PTR’yi değiştirmez):

```bash
hostnamectl set-hostname mail.lerta.com.tr
```

Asıl itibar metriği: `dig -x 168.231.109.27`.
