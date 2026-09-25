# Lerta Mail — ürün yol haritası (kurumsal SaaS)

**Hedef:** Gmail/Hotmail ölçeğinde rekabet etmek zorunda değil; **Türkiye’de kurumsal ve bireysel** müşteriye güven veren, özel domain odaklı, profesyonel kimlikli posta SaaS.

**Üç yüz:** `kurumsal`/`www` (vitrin) · `yonetim` (konsol) · `posta` (webmail) · motor: `apps/api` + MTA.

---

## Bugün (baseline)

| Alan | Durum |
|------|--------|
| DNS posta/yonetim/mail/kullanici/kurumsal | Canlı |
| Webmail (gelen, gönderilen, spam, taslak, arama, ek, IMAP panel) | MVP |
| Konsol (kayıt, domain sihirbazı, pilot kutu, plan, ödeme iskeleti) | MVP |
| Vitrin + API fiyat planları | MVP |
| Stripe / iyzico callback kodu | Kod hazır; **Stripe test anahtarları VPS’te sizden** |
| www → mail vitrin | **Bekliyor** (U88 taşınması) |
| Thread / konuşma görünümü | Yok |
| Çoklu kullanıcı / davet / roller (mail_admin) | **B3 — ekip daveti + roller** |
| Faturalama yaşam döngüsü (iptal, fatura e-postası) | Yok |
| KVKK export / silme self-servis | Yok |
| Kurumsal kimlik (logo, imza, hukuki sayfalar) | Kısmi |

---

## Faz A — Lansman çizgisi (gelir + marka)

**Amaç:** Müşteri vitrinden kayıt olup ödeme yapabilsin; marka tek elden profesyonel görünsün.

| # | İş | Takip / kabul kriteri |
|---|-----|------------------------|
| A1 | Stripe **test** checkout uçtan uca | Operatör paneli Stripe API OK; `smoke-mail-billing-stripe.sh`; test kart → Kurumsal plan — **kod hazır, VPS anahtar bekliyor** |
| A2 | Stripe **canlı** + webhook prod | `invoice.paid` sonrası plan; hata alert |
| A3 | iyzico sandbox → prod (TR ödeme) | Callback + plan aktivasyonu |
| A4 | `www` cutover | `preflight-www-cutover` OK; `www` title = Lerta Mail |
| A5 | Vitrin kurumsal kimlik | Logo, tipografi, SSS, KVKK, iletişim, SLA — **SSS/SLA + marka header (devam: SSS içerik, hukuk)** |
| A6 | Kayıt → onboarding akışı | Kayıt → domain sihirbazı; dashboard kurumsal banner — **B1 ile güçlendirildi** |
| A7 | Fiyatlandırma TRY + EUR tutarlılığı | Vitrin = API katalog = checkout tutarı |

**Bağımlılık:** A4 için U88’nin `u88.lerta.com.tr` (veya harici) taşınması.

---

## Faz B — Kurumsal müşteri (özel domain, ekip)

**Amaç:** `info@firma.com` modeli; ekip ve kota yönetimi.

| # | İş | Takip / kabul kriteri |
|---|-----|------------------------|
| B1 | Domain sihirbazı UX (varsayılan onboarding) | Kayıt → `/domain`; kurumsal dashboard domain-first — **uygulandı** |
| B2 | Çoklu posta kutusu (plan kotası) | `/mailboxes` listesi + kota çubuğu — **uygulandı** |
| B3 | Kullanıcı daveti + roller | `/team` + davet e-postası; `MAIL_ADMIN`, `BILLING_ADMIN`, `VIEWER` — **uygulandı** |
| B4 | Alias / paylaşımlı adres (isteğe bağlı) | `destek@` → iki kullanıcı |
| B5 | Gönderim kotası & upgrade | Dashboard saatlik kullanım çubuğu + `send-rate` API — **uygulandı** |
| B6 | Abonelik yaşam döngüsü | Stripe webhook grace, iptal/yenileme, konsol — **uygulandı** |
| B7 | Operatör: tenant listesi, askıya alma, abuse | `yonetim/operator` genişletme |

---

## Faz C — Bireysel / küçük iş (pilot paket)

**Amaç:** Tek kişi veya mikro işletme; düşük sürtünme.

| # | İş | Takip / kabul kriteri |
|---|-----|------------------------|
| C1 | `slug@kullanici.lerta.com.tr` tek tık | Kayıt → pilot kutu → webmail |
| C2 | Ücretsiz pilot limitleri net | 1 kutu, 80/saat; vitrinde açık |
| C3 | Pilot → Kurumsal yükseltme | Ödeme veya domain geçişi tek akış |
| C4 | Şifre sıfırlama / hesap güvenliği | Mail-only kullanıcı self-servis |
| C5 | Mobil uyumlu webmail | posta responsive; temel PWA (opsiyonel) |

---

## Faz D — Webmail “profesyonel kutu” (posta.lerta.com.tr)

**Amaç:** Günlük kullanımda Gmail’e yakın güven; thread şart değil ama kalite şart.

| # | İş | Öncelik | Kabul kriteri |
|---|-----|---------|----------------|
| D1 | Konuşma / thread listesi | Yüksek | Aynı `In-Reply-To` zinciri tek satır |
| D2 | Çöp / arşiv klasörleri | Yüksek | IMAP + UI uyumu |
| D3 | İmza ve şablonlar | Orta | Compose’da seçilebilir |
| D4 | Gelişmiş arama (filtre) | Orta | Gönderen, tarih, ek var |
| D5 | Büyük ek / kota depolama | Orta | Plan depolama GB; uyarı |
| D6 | Takvim / kişiler | Düşük | Harici CalDAV sonra |
| D7 | Bildirimler (push / ses) | Düşük | PWA sonrası |

---

## Faz E — Teslimat, güven, uyumluluk

**Amaç:** Kurumsal satın alma ve KVKK sorularına hazır cevap.

| # | İş | Takip |
|---|-----|--------|
| E1 | Tenant teslimat paneli | Bounce, suppression, son 7 gün gönderim |
| E2 | DMARC aggregate (rua) görünümü | Domain bazlı özet |
| E3 | KVKK veri export + hesap silme | API + konsol talebi |
| E4 | Denetim kaydı (tenant) | Kim, ne zaman, domain/kutu değişti |
| E5 | 2FA (TOTP) yönetim + webmail | Opsiyonel zorunlu kurumsal paket |
| E6 | SPF/DKIM rotasyon runbook | Operatör dokümantasyonu |
| E7 | Yedekleme / felaket kurtarma | RPO/RTO tanımı, Maildir yedek |

---

## Faz F — Operasyon ve ölçek

| # | İş |
|---|-----|
| F1 | İzleme: API, kuyruk, postfix, disk, cert süresi |
| F2 | Durum sayfası (`status.lerta.com.tr` veya vitrin altı) |
| F3 | Çok VPS / ayrı mail worker (yük büyüdüğünde) |
| F4 | White-label (logo, From adı) Enterprise |
| F5 | Public API / webhook (müşteri entegrasyonu) |

---

## Önerilen uygulama sırası (kod sprintleri)

1. **A1–A3** — Ödeme canlı (Stripe test → prod, iyzico)
2. **A5–A6** — Vitrin + onboarding profesyonelleştirme
3. **B1–B3** — Kurumsal çekirdek (domain öncelik, kutu, davet)
4. **D1–D2** — Webmail kurumsal günlük kullanım
5. **A4** — www cutover (iş kararı ile)
6. **E1–E4** — Güven & KVKK (satış öncesi B2B)
7. **C + D3–D5** — Bireysel parlatma ve depolama
8. **F** — Ölçek ve enterprise ekstralar

---

## KPI / takip (ürün analitiği)

| Metrik | Kaynak | Hedef (örnek) |
|--------|--------|----------------|
| Kayıt → ilk kutu | API audit / DB | > %60 24 saat |
| Domain DNS doğrulama | `mail_domain.verification_status` | > %40 7 gün |
| Ödeme başlat → tamamlama | Stripe/iyzico + webhook | > %70 |
| İlk outbound 7 gün | outbox / sent | Aktif tenant |
| Bounce oranı (platform) | suppression | < %2 |
| Destek talebi / tenant | manuel | düşüş |

Operatör konsoluna ileride **mini KPI kartı** (Faz B7 ile).

---

## Rakip konumlandırma (kısa)

| | Gmail / M365 | Lerta Mail |
|---|----------------|------------|
| Ölçek | Global, tüketici + enterprise | TR odak, KOBİ + özel domain |
| Güç | Ekosistem, depolama | Kendi MTA, şeffaf DNS, yerel ödeme |
| Zayıf kalır | Marka, AI, mobil app store | Thread, takvim, native app |
| Kazanır | Veri Türkiye, sade fiyat, hızlı domain kurulumu | |

---

## Repo referansları

- Ürün vizyonu: `docs/EMAIL_PRODUCT_LERTA_MAIL_SAAS.md`
- DNS: `docs/DNS_LERTA_COM_TR_ISIMTESCIL.md`
- Ödeme: `docs/MAIL_BILLING_STRIPE_SETUP.md`, `docs/MAIL_BILLING_IYZICO_SETUP.md`
- www: `docs/WWW_CUTOVER_LERTA_MAIL.md`, `scripts/preflight-www-cutover-lerta-mail.sh`

**Son güncelleme:** kurumsal vitrin HTTPS canlı; ödeme kodu merge; Stripe anahtarları müşteri tarafında.
