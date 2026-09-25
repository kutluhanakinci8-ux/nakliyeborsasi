# Ürün vizyonu — Lerta Mail (SaaS) + Lerta Logistics entegrasyonu

## Ne istiyoruz?

**Tek mail altyapısı** (kendi MTA, API, veri modeli), **iki müşteri yüzü**:

| Yüz | Kim kullanır | Nerede | Amaç |
|-----|----------------|--------|------|
| **A — Lerta Logistics** | Nakliye Borsası firmaları | `app.lerta.com.tr` / ileride `lerta.tr` | İhale, bildirim, org kimliği; mail **modül** olarak |
| **B — Lerta Mail (SaaS)** | Herhangi bir firma (satış) | `lerta.com.tr` altında **ayrı ön yüz** | Gmail benzeri kutu; **bağımsız ürün**, çok kiracılı |

B’yi **başka firmalara hizmet / satış** için tasarlıyoruz. A ile **aynı backend**, farklı **marka, giriş, abonelik ve UX**.

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

### Faz 0 — Yayın ayrımı ✅ (devam ediyor)

- [x] Logistics: `app.lerta.com.tr` (U88 `www` dokunulmaz)
- [ ] Mail SaaS için **ayrı hostname** kararı: örn. `posta.lerta.com.tr` veya `mail.lerta.com.tr` (sadece web UI, MTA `mail.` ile aynı host olabilir)
- [ ] İki web build veya tek monorepo **iki Next uygulaması**: `apps/web` (logistics), `apps/mail-web` (SaaS) — **henüz yok**

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

### Faz 5 — `lerta.tr` taşıma

- Logistics üretim domain’i
- Mail SaaS markası `lerta.com.tr` kalabilir veya `posta.lerta.tr`

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

## Önerilen hostname (netleştirin)

| Host | Öneri |
|------|--------|
| Logistics uygulama | `app.lerta.com.tr` ✅ |
| **Lerta Mail (SaaS UI)** | `posta.lerta.com.tr` veya `webmail.lerta.com.tr` |
| MTA / IMAP | `mail.lerta.com.tr` |
| Paylaşımlı tenant adresleri | `kullanici.lerta.com.tr` |
| Kurumsal site U88 | `www.lerta.com.tr` (dokunulmaz) |

---

## Sıradaki karar (sizden)

1. SaaS kutu UI için hostname: **`posta.lerta.com.tr`** uygun mu?
2. İlk satış modeli: sadece `@kullanici.lerta.com.tr` mi, yoksa ilk günden **özel domain** mi?
3. Logistics ile **aynı kullanıcı hesabı** mı, mail için **ayrı kayıt** mı?

Onay sonrası repo: `apps/mail-web` iskeleti + Faz 2 ekran listesi + DNS `posta` A kaydı.
