# Ürün vizyonu — Lerta Mail (SaaS) + Lerta Logistics

## Domain ayrımı (kesin kural)

| Ürün | Alan adı | Ne bağlanır |
|------|-----------|-------------|
| **Lerta Logistics** | **`lerta.tr`** | Nakliye borsası uygulaması, panel, ihale, lojistik modüller. Platform mail: `mail.lerta.tr`, tenant: `kullanici.lerta.tr`. |
| **Lerta Mail (satılacak posta programı)** | **`lerta.com.tr`** | Gmail benzeri webmail, müşteri kutuları, SaaS kayıt/abonelik. MTA: `mail.lerta.com.tr`, tenant: `kullanici.lerta.com.tr`. |

**İki domain birbirinden bağımsız marka/ürün.** Ortak olan şey: aynı VPS’teki **kod + API + Postfix** (tek motor, iki DNS profili).

`www.lerta.com.tr` üzerindeki mevcut U88 sitesi logistics veya mail ürünü değil; mail ürünü için **ayrı alt alan** (ör. `posta.lerta.com.tr`) kullanılır.

## Ne istiyoruz?

**Tek mail altyapısı** (kendi MTA, API, veri modeli), **iki ürün**:

| Yüz | Domain | Kim | Amaç |
|-----|--------|-----|------|
| **A — Lerta Logistics** | **lerta.tr** | Lojistik müşterileri | Uygulama + gömülü mail modülü (bildirim, org From) |
| **B — Lerta Mail SaaS** | **lerta.com.tr** | Herhangi bir firma (satış) | Ayrı ön yüz, Gmail benzeri kutu, çok kiracılı |

B’yi **başka firmalara hizmet / satış** için tasarlıyoruz. A ile **aynı backend**, farklı **domain, marka, giriş, abonelik ve UX**.

---

## Mimari özet (hedef)

```
                    ┌─────────────────────────────────────┐
                    │  VPS — Postfix, OpenDKIM, Rspamd    │
                    │  Dovecot (IMAP), pipe → API         │
                    └─────────────────┬───────────────────┘
                                      │
                    ┌─────────────────▼───────────────────┐
                    │  Nakliye Borsası API (Nest)         │
                    │  mail_domains, mail_mailbox,        │
                    │  inbound, outbox, org isolation     │
                    └─────────┬───────────────┬─────────┘
                              │               │
              ┌───────────────▼───┐   ┌───────▼────────────────┐
              │ A) Logistics Web   │   │ B) Lerta Mail Web       │
              │ /hesap/organizasyon│   │ app veya mail.*.com.tr  │
              │ /admin/bildirimler │   │ Gmail-like SPA/Next     │
              │ gömülü paneller    │   │ tenant login, kutu UI   │
              └───────────────────┘   └─────────────────────────┘
```

**Çok kiracılık (satış):** Zaten var olan `organizationId` + `mail_sender_identity` + `mail_mailbox`. Eklenecekler:

- Ürün / plan kodu: `lerta_mail_saas` vs `logistics_only`
- Faturalama ve kota (kutu sayısı, depolama, günlük gönderim)
- Müşteri özel domain (B5) ve inbound MX — **SaaS için zorunlu paket**
- Operatör süper-admin: tüm tenant’lar (mevcut platform admin genişletilir veya ayrı konsol)

---

## Faz planı (ürün odaklı)

### Faz 0 — Yayın ayrımı

- **Logistics:** üretim **`lerta.tr`** (`app.lerta.tr`, `mail.lerta.tr`, …) — mevcut Faz A/B planı
- **Mail SaaS:** üretim **`lerta.com.tr`** (`posta` veya `app` + `mail` + `kullanici`) — U88 `www` dokunulmaz
- Geçici: Logistics test için `app.lerta.com.tr` açılmış olabilir; uzun vadede logistics **yalnızca lerta.tr**
- [ ] `apps/mail-web` — sadece **lerta.com.tr** markası (henüz yok)

### Faz 1 — Ortak backend, pilot domain `*.lerta.com.tr`

- DNS: `mail`, `kullanici`, MX, DKIM (DNS_LERTA_COM_TR_ISIMTESCIL.md)
- Tenant: `slug@kullanici.lerta.com.tr` + inbound
- Logistics A yüzü: mevcut API + paneller

### Faz 2 — **Lerta Mail** ön yüz (Gmail yapısı) — SaaS B

Öncelik **B ürünü** için; Logistics’teki gömülü panel ikincil veya API’yi paylaşır.

| Özellik | Gmail benzeri |
|---------|------------------|
| Sol: Gelen, Gönderilen, Spam, Taslaklar | Klasörler |
| Orta: liste (konu, önizleme, tarih) | Thread listesi (Faz 2b) |
| Sağ / tam sayfa: okuma | HTML + ekler |
| Üst: Ara, Yaz | Compose |
| Ayarlar | Kimlik, özel domain, IMAP, şifre |
| Çok hesap | Org başına 1+ mailbox (ileride alias) |

Teknik: yeni `apps/mail-web`, `NEXT_PUBLIC_API_BASE_URL`, OAuth/JWT **org kullanıcısı** (firma sahibi + rol: mail_admin, mail_read).

### Faz 3 — Satışa hazır SaaS

- Kayıt / onboarding: “Firma adı → `firma@kullanici.lerta.com.tr` veya özel domain”
- Planlar: kutu, gönderim/gün, depolama
- Müşteri özel domain (B5) + MX wizard
- KVKK / denetim (B6) tenant bazlı export
- White-label (logo, From adı) — ileri

### Faz 4 — Lerta Logistics’te derin entegrasyon (A)

- İhale / mesajdan “E-posta ile gönder”
- Reply-To kurumsal kutu
- Tek giriş (SSO): logistics hesabı = mail hesabı (aynı `organizationId`)

### Faz 5 — İki domain’i yan yana üretim

- Logistics tamamen **lerta.tr** DNS + `WEB_PUBLIC_BASE_URL`
- Mail SaaS tamamen **lerta.com.tr**; `.env` profilleri veya iki VPS deploy ayrımı (ops kararı)

---

## Bugünkü kod ne kadar uyuyor?

| Bileşen | Logistics modül | SaaS Gmail |
|---------|-----------------|------------|
| MTA + outbound | ✅ | ✅ (paylaşımlı) |
| Inbound + mailbox DB | ✅ | ✅ |
| Org kimlik / B5 domain | ✅ | ✅ (satış paketi) |
| Admin operasyon merkezi | ✅ (platform) | Kısmen → **tenant admin** gerekir |
| Org gömülü inbox panel | Var, sınırlı | **Yetersiz** → ayrı mail-web |
| Thread / Gmail UX | ❌ planlı | **Faz 2 ana iş** |
| Billing / self-signup mail-only | ❌ | Faz 3 |

**Sonuç:** Altyapı ve API çoğunlukla **ortak motor**; satacağınız ürün için **ayrı ön yüz + onboarding + plan** şart.

---

## Hostname özeti

| | **lerta.tr** (Logistics) | **lerta.com.tr** (Mail SaaS) |
|---|--------------------------|------------------------------|
| Uygulama | `app.lerta.tr` (veya mevcut) | `posta.lerta.com.tr` (webmail UI) |
| MTA | `mail.lerta.tr` | `mail.lerta.com.tr` |
| Tenant adresler | `@kullanici.lerta.tr` | `@kullanici.lerta.com.tr` |
| Diğer | — | `www` = U88 (ayrı program, dokunulmaz) |

---

## Sıradaki karar (sizden)

1. SaaS kutu UI için hostname: **`posta.lerta.com.tr`** uygun mu?
2. İlk satış modeli: sadece `@kullanici.lerta.com.tr` mi, yoksa ilk günden **özel domain** mi?
3. Logistics ile **aynı kullanıcı hesabı** mı, mail için **ayrı kayıt** mı?

Onay sonrası repo: `apps/mail-web` iskeleti + Faz 2 ekran listesi + DNS `posta` A kaydı.
