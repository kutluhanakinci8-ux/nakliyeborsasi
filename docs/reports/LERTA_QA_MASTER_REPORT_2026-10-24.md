# Lerta — Master QA Raporu (2026-10-24)

**Oluşturulma:** 2026-10-24 22:59 (Europe/Istanbul)  
**Ortam:** Cloud agent + **canlı prod** (`posta.lerta.com.tr`, `yonetim.lerta.com.tr`)  
**Komut:** `bash scripts/run-lerta-premium-qa-suite.sh`  
**JSON:** [`LERTA_QA_MASTER_REPORT_2026-10-24.json`](./LERTA_QA_MASTER_REPORT_2026-10-24.json)

---

## 1. Executive özet

| Alan | Sonuç |
|------|--------|
| **Otomatik katman** | 7 PASS / **6 FAIL** / 1 MANUAL / 1 NOT_RUN |
| **Üretim kritik** | HTTPS, health, yük testi, TR l10n **PASS** |
| **Regresyon** | Parity + wave-2 **FAIL** (ortam/PTR/Lighthouse/billing) |
| **Güvenlik** | npm audit **4 critical**; yüzey başlıkları kısmi |
| **UAT** | Müşteri imzası bekliyor (M1–M10) |
| **Tam pentest** | Bu koşuda yapılmadı |

**Genel değerlendirme:** Günlük kullanım ve performans (hafif yük) prod’da sağlam; **kurumsal GA kapısı** için regresyon checklist, bağımlılık zafiyetleri, güvenlik başlıkları ve manuel UAT tamamlanmalı.

---

## 2. ISO/IEC/IEEE 29119 hizalı katman matrisi

| # | Test türü | Bu repoda nasıl karşılandı | Sonuç |
|---|-----------|----------------------------|--------|
| 1 | **Unit** | `core` vitest (9 test) | **PASS** |
| 2 | **Unit/Integration** | API `MailCampaignSegment.test.ts` (vitest); tam Nest+PG integration **yok** | **FAIL** (diğer `.spec.ts` CI’de koşmuyor) |
| 3 | **Regression** | `run-mail-messaging-parity-close-checklist.sh` | **FAIL** |
| 4 | **Regression (wave-2)** | PWA/Lighthouse/DNS/SSE | **FAIL** |
| 5 | **System** | `verify-posta-https.sh` (G0) | **PASS** |
| 6 | **Compliance** | MP-9 `SECURITY_*` doküman seti | **PASS** |
| 7 | **Security (deps)** | `npm audit --audit-level=high` | **FAIL** (4 critical, 15 high) |
| 8 | **Security (surface)** | `qa-security-surface.sh` kara kutu | **FAIL** |
| 9 | **Performance (load)** | `qa-load-stress.sh` 200 istek, 20 eşzamanlı | **PASS** |
| 10 | **Localization** | `qa-localization-tr.sh` | **PASS** |
| 11 | **E2E** | Playwright `messaging-hub.spec.ts` | **FAIL** (tarayıcı kurulumu / 2 test) |
| 12 | **UAT** | Prelaunch §7.2 manuel | **MANUAL** |
| 13 | **Pentest** | OWASP ZAP/Burp profesyonel | **NOT_RUN** |

---

## 3. Fonksiyonel ve yapısal testler (detay)

### 3.1 Birim (Unit) — PASS

```
@nakliyeborsasi/core — 4 dosya, 9 test, süre ~320ms
- mailComposeBuiltinTemplates
- emailOutboxMetadata
- whatsappBridgeDelivery
- structuredLog
```

### 3.2 Entegrasyon — Kısmi / FAIL

| Bulgu | Açıklama | Öncelik |
|-------|----------|---------|
| API `.spec.ts` dosyaları | `describe is not defined` — vitest import/globals eksik (8 dosya) | P1 |
| NestJS + PostgreSQL | Gerçek DB ile modül entegrasyon testi yok | P2 |
| JMAP smoke | `MAIL_JMAP_JWT` yok — atlandı | P2 (ops) |

**Geçen örnek:** `MailCampaignSegment.test.ts` (segment allowlist).

### 3.3 Sistem — PASS (smoke)

- Posta HTTP→HTTPS 301, sertifika geçerli (Dec 2026).
- API `/health` → 200.

### 3.4 Regresyon — FAIL

**Parity close kök nedenler:**

| Madde | Durum |
|-------|--------|
| VPS `.env` agent’ta yok | Push/AI verify **SKIP** |
| `OPERATOR_JWT` yok | Billing-health API **SKIP** |
| Dovecot / IMAP gold | Sunucuda değil — **SKIP** |
| P0 inbound PTR | Hostinger rDNS uyarısı (prod DNS) |
| Billing P0 | Stripe canlı anahtarları yok |

**Wave-2 kök nedenler:**

| Madde | Durum |
|-------|--------|
| SSE smoke | Yerel `127.0.0.1:3010` — agent ortamı |
| Lighthouse PWA | Skor **0** (headless Chrome kısıtı; prod SW v9 canlı) |
| DNS legacy | `kullanici.lerta.com.tr` hâlâ yayında (soft warn) |

---

## 4. Performans ve yük testleri

**Script:** `scripts/qa-load-stress.sh` (prod login, düşük hacim — üretimi zorlamaz)

| Metrik | Değer |
|--------|--------|
| İstek | 200 |
| Eşzamanlılık | 20 |
| Hata | **0** |
| RPS | **~109.5** |
| p50 gecikme | **98 ms** |
| p95 gecikme | **905 ms** |
| Sonuç | **PASS** (<5% hata, p95 <8s) |

**Eksik (henüz yapılmadı):**

- Stres testi (k6/Artillery) — çöküş eşiği ve graceful degradation ölçümü
- API authenticated load (mail-inbox list, messaging SSE)
- Soğuk başlangıç / deploy sonrası 15 dk soak testi

---

## 5. Güvenlik testleri

### 5.1 Bağımlılık taraması — FAIL

`npm audit` özet: **38 zafiyet** (4 critical, 15 high, 15 moderate, 4 low).

Örnek kritik sınıflar: `webpack` HttpUriPlugin SSRF (Nest CLI zinciri), diğer transitive paketler.

**Aksiyon:** `npm audit fix` + breaking upgrade planı; çeyreklik `SKIP_NPM_AUDIT=0` CI kapısı.

### 5.2 Yüzey (kara kutu) — FAIL

| Kontrol | Sonuç |
|---------|--------|
| posta HSTS | OK |
| posta `X-Content-Type-Options` | **Eksik** |
| app HSTS | **Eksik** |
| `/health` | 200 |
| `company/mail-inbox/messages` | **404** (401/403 yerine — route veya gateway) |
| `platform-admin/mail/billing-health` | 401 OK |

### 5.3 Pentest — NOT_RUN

Tam sızma (OWASP Top 10, auth bypass, IDOR, SSRF, upload) için **harici pentest** veya ZAP full scan önerilir. MP-9 dokümantasyonu hazır; sertifikalı ISO 27001/PCI QSA denetimi ayrı proje.

---

## 6. Uyumluluk ve standartlar

| Standart / çerçeve | Durum |
|--------------------|--------|
| **MP-9 SOC2-lite** doküman seti (5 dosya) | **PASS** |
| DR drill evidence | SKIP (VPS evidence dosyası) |
| **ISO 29119** süreç dokümantasyonu | Bu rapor + `run-lerta-premium-qa-suite.sh` ile kısmi |
| HIPAA / PCI-DSS | Kapsam dışı (ödeme Stripe/iyzico ayrı) |

---

## 7. Kullanıcı kabul testleri (UAT) — MANUAL

Müşteri imzası gereken set ([prelaunch gate §7.2](../MAIL_PRELAUNCH_COMPETITIVE_GATE_2026-10-24.md)):

| ID | Senaryo | Durum |
|----|---------|--------|
| M1 | Thunderbird ↔ IMAP arşiv/çöp | Bekliyor |
| M2 | Outlook mobil IMAP | Bekliyor |
| M3 | Microsoft Graph takvim iki yön | OAuth prod |
| M4 | Google Takvim iki yön | OAuth prod |
| M5 | iOS PWA + push | Bekliyor |
| M6 | WebAuthn / posta kilidi | Bekliyor |
| M7 | Kampanya A/B + webhook | Kısmen otomatik |
| M8 | KVKK audit export | Bekliyor |
| M9 | MSN/Gmail/Outlook inbox teslimat | Bekliyor |
| M10 | Lighthouse PWA ≥80 (kanıt dosyası) | Bekliyor |

---

## 8. Lokalizasyon (tr-TR) — PASS

| URL | Kontrol |
|-----|---------|
| kurumsal.lerta.com.tr/kvkk | "KVKK" |
| posta.lerta.com.tr/login | "Giriş" |
| www.lerta.com.tr/posta | "Lerta" |
| TZ | Europe/Istanbul örnek tarih OK |

**Eksik:** en-US / de-DE tam i18n suite yok (ürün öncelik TR).

---

## 9. Öncelikli aksiyon listesi (P0→P2)

| Öncelik | Aksiyon |
|---------|---------|
| **P0** | npm **critical** 4 adet giderilmeli veya risk kaydı |
| **P0** | posta + app **X-Content-Type-Options** / HSTS tutarlılığı |
| **P0** | UAT M9 teslimat + M1 IMAP gold (VPS) |
| **P1** | API vitest workspace — tüm `.spec.ts` import düzeltmesi + CI job |
| **P1** | Playwright CI: `npx playwright install` + E2E JWT secret |
| **P1** | PTR Hostinger ([MAIL_PTR_HOSTINGER.md](../MAIL_PTR_HOSTINGER.md)) |
| **P2** | k6 stres profili + authenticated load |
| **P2** | Harici pentest sözleşmesi |

---

## 10. Tekrar çalıştırma

```bash
bash scripts/run-lerta-premium-qa-suite.sh
```

VPS tam kapı (push, IMAP, OPERATOR_JWT):

```bash
ENV_FILE=/var/www/nakliyeborsasi/.env OPERATOR_JWT=... bash scripts/run-mail-messaging-parity-close-checklist.sh
```

---

*Bu rapor otomatik üretilmiştir; pentest ve tam UAT müşteri oturumları ile güncellenmelidir.*
