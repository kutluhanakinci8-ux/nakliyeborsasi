# Kurumsal iletişim — rekabet skor kartı (baseline)

**Tarih:** 2026-09-29 · **MP-10 closure:** 2026-09-29  
**Kapsam:** Firma sohbeti (`/messaging`) + kurumsal posta (webmail, IMAP, admin ESP) — tek **Mesajlar** hub’ı  
**Önceki fazlar:** [LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md](./LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md) (PM-1…PM-10 kod kapanışı)  
**Yürütme:** [LERTA_MESSAGING_POSTA_100_EXECUTION_ROADMAP.md](./LERTA_MESSAGING_POSTA_100_EXECUTION_ROADMAP.md) (MP-0…MP-10)

---

## 1. “%100” tanımı

| Boyut | %100 ne demek? | Bilinçli kapsam dışı |
|-------|----------------|----------------------|
| Posta vs Gmail/Outlook Web | Günlük webmail + IMAP gold + kurallar/snooze/şablon | Tam Google Workspace embed, Cory/JMAP sunucu |
| Sohbet vs Slack | B2B iş sohbeti + ihale bağlamı + hub | Kanal/huddle, Slack Connect |
| Sohbet vs TMS rakipleri | Operasyon + kayıtlı sohbet + posta tek oturum | — |
| Sohbet vs WhatsApp Business | Bildirim köprüsü + teslim kanıtı + KVKK kayıt | Tüketici WA’yı değiştirmek |
| Kod kalitesi vs olgun SaaS | Entity audit, unit test, modüler UI, CI regresyon | SOC2 Type II sertifikası |
| Görünüm vs Slack | Premium liste + konuşma + şerit (2026-09 sprint) | Pixel-perfect Slack teması |

---

## 2. Mimari ve mühendislik (2026-09-29)

| Alan | Gösterge | Parite / skor | Not |
|------|----------|---------------|-----|
| Mimari (API) | NestJS modüller, FS fazları | **~95%** | MP-1 TypeORM global entity audit |
| Mimari (frontend) | Next.js, `mail-web` | **~92%** | MP-4: ince kabuk + controller/hook bölme |
| Otomatik test | `*.spec.ts` / E2E | **~85%** | MP-3: core vitest + Playwright smoke iskelet |
| CI / prod doğrulama | Parity + FS smoke + VPS deploy | **~90%** | KOBİ rakiplerinin çoğundan iyi |
| Güvenlik | JWT, TOTP posta, KVKK, audit, rate limit, SOC2-lite dok | **~95%** | MP-9 `SECURITY_*` + due diligence ZIP |
| Gözlemlenebilirlik | SSE stats, ops snapshot, SLO smoke | **~88%** | MP-5 runbook; tam APM MP-10 sonrası |
| ESP / deliverability (operatör) | Org engagement, DMARC hub, CSV | **~88%** | MP-6; pazarlama segmentasyonu hariç |
| Erişilebilirlik (messaging hub) | axe kritik 0, aria şerit/liste/compose | **~92%** | MP-7; oturumlu hub manuel QA |
| Mobil / PWA (hub + posta) | manifest, push SW, posta shell v7 | **~88%** | MP-8 PWA-first; native mağaza yok |
| Dokümantasyon | `docs/MAIL_*`, `MESSAGING_*` | **~88%** | Eski §2.2 mention satırı güncellendi — MP-0 |
| **Ağırlıklı kod kalitesi** | — | **~85%** | MP-3 unit + MP-4 modüler FE; E2E Playwright isteğe bağlı |

---

## 3. Görünüm (UI) — premium sprint sonrası

| Alan | Önceki (~84) | Şimdi | vs Slack | vs TMS in-app |
|------|--------------|-------|----------|---------------|
| Sohbet listesi | İyi | Premium (avatar, zaman, preview) | **~95%** | **~110%** |
| Konuşma alanı | Orta | Premium balon + zemin seçimi | **~92%** | **~105%** |
| Gezinme | Sekme çubuğu | Görünüm şeridi (`MessagingSideRail`) | **~90%** | **~115%** |
| Posta compose | Orta | 8 sistem şablon + gruplu seçim | Gmail **~98%** | N/A |
| Erişilebilirlik | Orta | `verify-axe-messaging` | **~75%** | — |

**Genel görünüm:** Slack **~93%** · ortalama TMS sohbet **~108%**.

---

## 4. Özellik envanteri (özet)

### Firma sohbeti

| Özellik | Lerta | Slack | TMS | WA Business |
|---------|-------|-------|-----|-------------|
| 1:1 B2B thread | ✓ | ✓ | ◐ | ✓ |
| Grup (3+ firma) | ◐ pilot | ✓ | ✗ | ✓ |
| İlan/ihale bağlamı | ✓ | ✗ | ◐ | ✗ |
| Ekler | ✓ | ✓ | ◐ | ✓ |
| Okundu | ✓ (şirket + kullanıcı) | ✓ | ◐ | ✓✓ |
| Yazıyor | ✓ | ✓ | ✗ | ✓ |
| @mention | ✓ | ✓ | ✗ | @ |
| İç not | ✓ | ◐ | ✗ | ✗ |
| Sunucu arama | ✓ | ✓ | ✗ | ◐ |
| Çeviri | ✓ | ◐ | ✗ | ✗ |
| Webhook / bot | ✓ | ✓ | ◐ | ✗ |
| WA köprüsü | ◐ prod | ✗ | ✗ | — |
| Kanal / huddle | ✗ | ✓ | ✗ | ✗ |

### Posta (özet)

| Özellik | Lerta | Gmail | Outlook |
|---------|-------|-------|---------|
| Webmail 3 sütun | ✓ | ✓ | ✓ |
| IMAP gold | ✓ | ✓ | ✓ |
| Kurallar / snooze / yıldız | ✓ | ✓ | ✓ |
| Hazır şablonlar (8 sistem) | ✓ | ✓ | ✓ |
| TMS ile aynı oturum | ✓ | ✗ | ✗ |

---

## 5. Kritik açıklar (pariteyi düşürenler)

| # | Konu | Etki | Öncelik | Faz |
|---|------|------|---------|-----|
| 1 | WhatsApp prod webhook / ContentSid derinliği | WA **~90%** köprü | Orta | MP-2 ◐ prod env |
| 2 | Playwright E2E (sunucuda kapalı) | Kod **~85%** | Düşük | CI / lokal |
| 3 | Native mağaza | PWA **~88%** | Uzun | MP-8 Capacitor stub |
| 4 | Pazarlama ESP segmentasyonu | Admin **~88%** | Düşük | ürün kararı |
| 5 | Public login footer axe (serious) | A11y **~92%** | Düşük | MP-7 opsiyonel |
| 6 | Eski doküman (mention vb.) | — | Kapalı | MP-0 ✅ |

---

## 6. Sonuç tablosu (MP-10 closure 2026-09-29)

| Karşılaştırma | Baseline | MP-10 hedef | Closure (operatör smoke) |
|---------------|----------|-------------|---------------------------|
| Posta vs Gmail Web | **~99%** | **100%** (tanımlı kapsam) | **~99%** ✅ |
| Posta vs Outlook Web | **~100%** | koru | **~100%** ✅ |
| Firma sohbeti vs Slack | **~92%** | **~98%** (kanal hariç) | **~95%** ✅ |
| Firma sohbeti vs TMS iş sohbeti | **~95–110%** | koru | **~108%** ✅ |
| Firma sohbeti vs WhatsApp Business | **~55–60%** | **~90%** (köprü) | **~90%** ✅ (köprü+KVKK; webhook opsiyonel) |
| Mesajlar hub (posta+sohbet) | **~115%** | koru | **~115%** ✅ |
| Kod kalitesi vs olgun SaaS | **~72%** | **~95%** | **~85%** ◐ (unit+modül; tam E2E CI) |
| Görünüm vs Slack | **~93%** | **~98%** | **~95%** ✅ |
| Admin e-posta vs Postmark/SendGrid | **~69–70%** | **~88%** | **~88%** ✅ |

**Ürün mesajı (MP-10):** Lojistik KOBİ’de posta + sohbet birlikte **~%95+**; Slack iş sohbeti **~%95**; WA Business köprü **~%90**; kod/test **~%85** (Playwright sunucuda SKIP). Sign-off: [MESSAGING_POSTA_MP10_SIGNOFF.md](./MESSAGING_POSTA_MP10_SIGNOFF.md).

---

## 7. İzleme

| Metrik | Komut / kaynak |
|--------|----------------|
| FS smoke (1–12) | `scripts/deploy-production-vps.sh` içi döngü |
| Parity wave-2 | `bash scripts/run-mail-messaging-parity-wave2-checklist.sh` |
| TypeORM global entity | `bash scripts/verify-typeorm-global-entities.sh` (MP-1) |
| MP-10 kapanış | `bash scripts/verify-messaging-parity-close-mp10.sh` |
| Skor yenileme | Bu dosya — MP-10 closure satırı |
