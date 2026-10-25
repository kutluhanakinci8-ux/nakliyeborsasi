# Lerta — Master QA Raporu (2026-10-25)

**Oluşturulma:** 2026-10-25 17:12 +03  
**Komut:** `bash scripts/run-lerta-premium-qa-suite.sh`  
**JSON özet:** [`LERTA_QA_MASTER_REPORT_2026-10-25.json`](./LERTA_QA_MASTER_REPORT_2026-10-25.json)

## Executive özet

| Metrik | Değer |
|--------|--------|
| Otomatik katman FAIL | **1** |
| UAT (müşteri) | Manuel — §7.2 prelaunch gate |
| Tam pentest | Bu koşuda çalıştırılmadı |

## Katman sonuçları (ISO/IEC/IEEE 29119 hizalı çerçeve)

| # | Katman | Standart karşılığı | Sonuç |
|---|--------|-------------------|--------|
| 1 | Unit (core) | Bileşen testi | PASS |
| 2 | Unit/Integration (API) | Modül + servis | PASS |
| 3 | Regression (parity close) | Değişiklik regresyonu | PASS |
| 4 | Regression (wave-2) | PWA/Lighthouse/DNS | PASS |
| 5 | System (prod smoke) | Canlı sistem | PASS |
| 6 | Compliance (MP-9) | SOC2-lite dok + süreç | PASS |
| 7 | Security (npm audit) | Bağımlılık zafiyeti | FAIL |
| 8 | Security (surface) | Kara kutu HTTP/TLS | PASS |
| 9 | Performance (load) | Yük (hafif prod) | PASS |
| 10 | Localization (tr-TR) | L10n | PASS |
| 11 | E2E (Playwright) | Uçtan uca (kısmi) | PASS |
| 12 | UAT Faz 6 kod | M1–M10 kod kapısı | PASS |
| 13 | UAT ops | Yapılandırma + imza | CONFIG_LATER |
| 14 | Pentest | Sızma (tam) | NOT_RUN |

## Kurumsal test türleri — özet (6 sütun)

| Test türü | Otomasyon | Sonuç | Not |
|-----------|-----------|--------|-----|
| Fonksiyonel / yapısal (unit, entegrasyon, sistem, regresyon) | `test:unit` (9), `test:api` (37), parity + wave-2, TypeORM 88 entity | **%95 geçti** | Gerçek DB entegrasyon testi yok; mail-web için Playwright yok |
| Performans / yük | `qa-load-stress.sh` + autocannon health | **Geçti (hafif)** | ~103 RPS login, health p50 ~97 ms; tam stres/k6 profili yok |
| Güvenlik / pentest | npm audit + `qa-security-surface.sh` | **Kısmi** | Yüzey/TLS/auth PASS; 2 critical npm; tam OWASP pentest yapılmadı |
| UAT (müşteri) | Canlı OAuth + gönder/al (25 Ekim) | **Kısmi geçti** | Gmail + Hotmail Graph bağlı; junk klasörü, bazı skip’ler açık |
| Uyumluluk / standart | MP-9 SOC2-lite dok | **Dok geçti** | ISO 29119 süreç kanıtı kısmi; ISO 27001 sertifikası ayrı proje |
| Lokalizasyon | `qa-localization-tr.sh` | **TR geçti** | `en-US` UI katmanı yok; tarihler `tr-TR`, TZ doğrulandı |

## Manuel UAT — canlı ortam (25 Ekim 2026)

| Senaryo | Sonuç | Bulgu |
|---------|--------|--------|
| Gmail OAuth (`lertaotoservis@gmail.com`) | PASS | Bağlantı + senkron; history `labelAdded` düzeltmesi sonrası delta çalışıyor |
| Microsoft Graph (`lertaposta@hotmail.com`) | PASS (kısmi) | Gönderim Graph 202 boş gövde düzeltildi; gelen junk → Spam eşlemesi beklenen |
| OAuth DTO doğrulama (`code`/`state`) | PASS | `CompleteExchangeOAuthRequestDto` class-validator |
| CAP bağlı hesap denetimi | PASS | `listConnectedAccountEvents` orgId tip düzeltmesi |
| Birleşik gelen kutusu filtreleri | PASS | Gmail + Microsoft birlikte listeleniyor |
| IMAP Thunderbird / iOS push / takvim OAuth | BEKLEMEDE | OPERATOR_JWT ve VPS `.env` ile tam parity smoke atlandı |

## Bilinen eksikler / aksiyonlar

1. **npm audit:** 2 critical (`next`, `tar` zinciri) — planlı Next 15 patch + `npm audit fix` turu.
2. **API güvenlik başlıkları:** `/api/v1/health` üzerinde HSTS yok (posta.lerta.com.tr’de var); API nginx katmanına HSTS/CSP politikası eklenmeli.
3. **Integration test DB:** NestJS + Postgres entegrasyon testleri yok; parity scriptleri prod read-only smoke ile kısmi.
4. **Stress test:** `qa-load-stress.sh` düşük hacimli; gerçek stres için k6/Artillery ayrı profil gerekir.
5. **Pentest / ISO 27001 / PCI:** MP-9 dokümantasyon var; sertifikalı pentest ve QSA denetimi ayrı proje.
6. **UAT ops:** PTR, billing prod anahtarları, push VAPID, IMAP gold — VPS’te `OPERATOR_JWT` + `.env` ile tam checklist.
7. **i18n:** İngilizce UI ve `Europe/Istanbul` timezone seçici henüz ürün genelinde yok.

## Referanslar

- [MAIL_PRELAUNCH_COMPETITIVE_GATE_2026-10-24.md](../MAIL_PRELAUNCH_COMPETITIVE_GATE_2026-10-24.md)
- [SECURITY_SOC2_LITE_OVERVIEW.md](../SECURITY_SOC2_LITE_OVERVIEW.md)
- [LERTA_MAIL_PARITY_100_CLOSURE_EXECUTION.md](../LERTA_MAIL_PARITY_100_CLOSURE_EXECUTION.md)

