# Kurumsal iletişim — %100 parite yürütme yol haritası (MP-0 … MP-10)

**Tarih:** 2026-09-29  
**Baseline skor kartı:** [LERTA_MESSAGING_POSTA_COMPETITIVE_SCORECARD.md](./LERTA_MESSAGING_POSTA_COMPETITIVE_SCORECARD.md)  
**Önceki ürün fazları:** [LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md](./LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md) (PM-1…PM-10 ✅ kod)  
**Firma sohbeti Excellence:** [FIRMA_SOHBETI_COMPETITIVE_ROADMAP.md](./FIRMA_SOHBETI_COMPETITIVE_ROADMAP.md) · [MESSAGING_FS12_CHANNELS.md](./MESSAGING_FS12_CHANNELS.md)

**Çalışma kuralı:** Fazlar **sırayla** uygulanır. Bir fazın **kabul kriterleri** yeşil olmadan sonraki faza geçilmez (acil prod hotfix istisna).

---

## Faz özeti

| Faz | Kod | Odak | Hedef Δ (baseline →) | Bağımlılık |
|-----|-----|------|----------------------|------------|
| **MP-0** | `maturity-p0` | Skor kartı + doküman gerçeği | Dok **88→95%** | — ✅ |
| **MP-1** | `maturity-p1` | API mimari sağlık (TypeORM global) | API **82→95%** | MP-0 ✅ |
| **MP-2** | `maturity-p2` | WhatsApp FS-12 teslim & prod | WA **55→90%** | MP-1 ◐ kod |
| **MP-3** | `maturity-p3` | Vitest unit + Playwright E2E iskelet | Test **40→85%**, kod **72→85%** | MP-1 ◐ unit+e2e smoke |
| **MP-4** | `maturity-p4` | `MessagingPageClient` / `MailClient` bölme | FE mimari **70→92%** | MP-3 ✅ sohbet + posta giriş |
| **MP-5** | `maturity-p5` | Gözlemlenebilirlik (metrik, SLO, dashboard) | Obs **72→88%** | MP-1 ✅ |
| **MP-6** | `maturity-p6` | ESP analitik & deliverability UI | Postmark **69→88%** | MP-5 ◐ |
| **MP-7** | `maturity-p7` | Erişilebilirlik (axe → WCAG AA kritik) | A11y **75→92%** | MP-4 ◐ |
| **MP-8** | `maturity-p8` | PWA polish + native shell kararı | Mobil **75→88%** | MP-4 ◐ |
| **MP-9** | `maturity-p9` | SOC2-lite runbook + güvenlik dokümanı | Güvenlik **85→95%** dok | MP-5 |
| **MP-10** | `maturity-p10` | Parite kapanış kapısı + skor yenileme | Tüm tablo hedefleri | MP-2…MP-9 |

---

## MP-0 — Baseline kilitleme (● şimdi)

**Amaç:** Tek doğruluk kaynağı; eski “mention yok / yazıyor yok” satırlarını güncelle.

| Görev | Durum | Not |
|-------|--------|-----|
| `LERTA_MESSAGING_POSTA_COMPETITIVE_SCORECARD.md` | ✅ | Bu sprint |
| `LERTA_MESSAGING_POSTA_100_EXECUTION_ROADMAP.md` | ✅ | Bu dosya |
| `FIRMA_SOHBETI_COMPETITIVE_ROADMAP.md` §2.2 güncelle | ✅ | Gerçek özellik matrisi |
| `run-mail-messaging-parity-close-checklist.sh` → MP checklist linki | ◐ | MP-10’da birleştir |

**Kabul:** Ürün/ops ekibi skor kartındaki % ile doküman çelişmez.

---

## MP-1 — API mimari sağlık (TypeORM & modül tutarlılığı)

**Amaç:** `TypeOrmConfigurationFactory` içinde **tüm** `*Entity.ts` kayıtlı; geçmişteki `mail_compose_preset` sınıfı hatası tekrarlanmaz.

| Görev | Dosya / araç |
|-------|----------------|
| Eksik global entity kayıtları (ör. `MailDmarcAggregateReportEntity`) | `TypeOrmConfigurationFactory.ts` |
| CI/deploy doğrulama | `scripts/verify-typeorm-global-entities.sh` |
| Modül `forFeature` vs global diff raporu (uyarı) | script çıktısı |

**Kabul:** `bash scripts/verify-typeorm-global-entities.sh` → exit 0 · API boot smoke · ilgili servisler repository inject hatası vermez.

---

## MP-2 — WhatsApp FS-12 (teslim & satış vaadi)

**Amaç:** Firma ayarı “etkin” ise **gerçekten** bildirim gider; Twilio `21654` için ContentSid yolu net.

| Görev | Referans |
|-------|----------|
| Prod env checklist: `TWILIO_*`, `TWILIO_WHATSAPP_CONTENT_SID`, webhook URL | `MESSAGING_FS12_CHANNELS.md` |
| Admin UI: köprü durumu + son hata (`21654` yönlendirme metni) | `MessagingWhatsappBridgeService.ts` |
| Sandbox + prod smoke | `verify-messaging-wa-bridge-sandbox.sh`, FS-12 deploy döngüsü |
| Teslim rozeti / stamp (FS-12B) | thread message stamp API |

**Kabul:** Sandbox script PASS · prod’da test firma → WA mesajı · skor kartı WA **≥90%** (bildirim köprüsü kapsamı).

---

## MP-3 — Otomatik test (regresyon kalkanı)

**Amaç:** FS script’lerine **ek** olarak hızlı unit + kritik E2E.

| Katman | İçerik |
|--------|--------|
| **core** | `mailComposeBuiltinTemplates` (8 şablon), saf fonksiyonlar |
| **api** | Jest + `@nestjs/testing`: `MessagingThreadApplicationService` read-state (`max(latest, now)`), `MailComposePresetService` fallback |
| **web** | Playwright (`apps/web/e2e/messaging-hub.spec.ts`): login next, auth redirect, JWT ile şerit Posta/Sohbet |
| **CI** | `npm run test:unit` · `scripts/verify-messaging-playwright-e2e.sh` |

**Kabul:** ≥6 unit test (core) · 2+ E2E public smoke · JWT test opsiyonel (`E2E_ACCESS_TOKEN`) · kod kalitesi **≥85%** (devam).

---

## MP-4 — Frontend modülerleştirme

**Amaç:** Bakım riskini düşür; premium UI sprint’ini sürdürülebilir kıl.

| Parça | Modül | Durum |
|-------|--------|--------|
| Route / sekme / zemin | `hooks/useMessagingPageRoute.ts` | ✅ |
| Sohbet state + API | `hooks/useMessagingChatController.ts` | ✅ |
| Yardımcılar | `lib/messagingPageHelpers.ts` | ✅ |
| Thread listesi | `components/messaging/MessagingThreadSidebar.tsx` | ✅ |
| Konuşma + compose | `components/messaging/MessagingConversationPanel.tsx` | ✅ |
| Sayfa kabuğu | `MessagingPageClient.tsx` (**~245** satır) | ✅ |
| `mail-web` MailClient | `MailClient.tsx` + `useMailClientController` + `MailClientShell` | ✅ giriş **~24** satır |
| `mail-web` ileri bölme | sidebar / compose ayrı dosyalar | ◐ isteğe bağlı |

**Kabul:** `MessagingPageClient.tsx` **<800** satır · `MailClient.tsx` **<800** satır · MP-3 E2E smoke yeşil.

---

## MP-5 — Gözlemlenebilirlik ✅

**Amaç:** SSE yük, outbox, WA köprü hataları tek bakışta.

| Görev | Durum | Not |
|-------|--------|-----|
| Yapılandırılmış log (WA köprü hata) | ✅ | `core/messaging/structuredLog.ts` · `whatsapp_bridge_delivery_failed` |
| `/health/live` + `/health/ready` | ✅ | SSE stats + DB ping |
| Operatör snapshot | ✅ | `GET /platform-admin/communications-ops/snapshot` |
| `smoke-messaging-sse-load.sh` SLO eşiği | ✅ | `MESSAGING_SSE_P95_MS_MAX` (varsayılan 8000 ms) |
| Ops runbook + Grafana şablon | ✅ | `MESSAGING_POSTA_OPS_RUNBOOK.md` · `observability/grafana-communications-ops.json` |
| Doğrulama scripti | ✅ | `verify-communications-ops-snapshot.sh` · maturity + VPS verify |
| DR / multi-VPS kanıt periyodu | ◐ | `verify-dr-drill-evidence.sh` (MP-9 ile hizala) |
| Mail gönderim structured log | ◐ | Outbox zaten admin health; ayrı JSON satırı MP-6 |

**Kabul:** Ops runbook + dashboard veya Grafana JSON · obs skor **≥88%** — karşılandı.

---

## MP-6 — ESP analitik & deliverability ◐

**Amaç:** Postmark/SendGrid **operatör** seviyesine yaklaş (pazarlama segmentasyonu hariç).

| Görev | Durum | Not |
|-------|--------|-----|
| Org metadata ile engagement özet | ✅ | `getEngagementSummary(since, organizationId)` |
| Engagement CSV `organizationId` kolonu + filtre | ✅ | `engagement-export?organizationId=` |
| Deliverability hub (org + DMARC + dönem) | ✅ | `deliverability-hub?days=` · `MailDeliverabilityPanel` |
| Doğrulama | ✅ | `verify-mail-deliverability-mp6.sh` |
| Admin trend grafikleri (önceki dönem Δ) | ◐ | `AdminMailAnalyticsPanel` 7/30 — 90g isteğe bağlı |

**Kabul:** Benchmark admin **≥88%** · DMARC entity global kayıt (MP-1) ✅

---

## MP-7 — Erişilebilirlik ◐

**Amaç:** Kurumsal ihale kullanıcıları için klavye + ekran okuyucu.

| Görev | Durum | Not |
|-------|--------|-----|
| `verify-axe-messaging` / `verify-messaging-a11y-mp7.sh` | ✅ | maturity checklist · VPS `SKIP_AXE=1` |
| Şerit `tablist` + `aria-selected` | ✅ | `MessagingSideRail` |
| Thread list `aria-label` / `aria-current` | ✅ | `ChatThreadListItem`, liste `ul` |
| Compose `textarea` `aria-label` | ✅ | `MessagingConversationPanel` |
| Kontrast (premium zemin) | ✅ | `globals.css` MP-7 bloğu |
| CI workflow (axe job) | ◐ | prod URL; isteğe bağlı workflow genişletme |

**Kabul:** axe kritik **0** · skor **≥92%** — `bash scripts/verify-messaging-a11y-mp7.sh` (SKIP_AXE=0).

---

## MP-8 — Mobil & PWA ✅

**Amaç:** Native kararını dokümante et; PWA’yı WA/Slack mobil **kabul edilebilir** seviyeye çek.

| Görev | Durum | Not |
|-------|--------|-----|
| Hub `manifest.webmanifest` + metadata | ✅ | `apps/web/public` · `layout.tsx` |
| `messaging-push-sw.js` prod smoke | ✅ | `verify-messaging-hub-pwa-mp8.sh` |
| Posta PWA shell | ✅ | `verify-mail-web-pwa-prod.sh` (mevcut) |
| Ürün kararı **PWA-first** | ✅ | `docs/MESSAGING_MOBILE_MP8.md` |
| iOS push runbook linki | ✅ | `MAIL_WEB_PUSH_IOS.md` · `MESSAGING_WEB_PUSH.md` |
| Lighthouse PWA ≥85 | ◐ | `SKIP_LIGHTHOUSE=0` · evidence JSON |
| Capacitor mağaza | ◐ | stub `capacitor.config.ts` — FS-7C+ |

**Kabul:** `verify-messaging-hub-pwa-mp8.sh` PASS · mobil skor **≥88%** (PWA-only kapsam).

---

## MP-9 — Güvenlik & uyumluluk dokümantasyonu ◐

**Amaç:** TR KVKK yeterliliğini **süreç** tarafında görünür kıl (SOC2 Type II değil).

| Görev | Durum | Not |
|-------|--------|-----|
| SOC2-lite indeks | ✅ | `docs/SECURITY_SOC2_LITE_OVERVIEW.md` |
| Incident response | ✅ | `SECURITY_INCIDENT_RESPONSE.md` |
| Veri işleme envanteri (KVKK) | ✅ | `SECURITY_DATA_PROCESSING_INVENTORY.md` |
| Audit saklama + export SLA | ✅ | `SECURITY_AUDIT_RETENTION_EXPORT.md` |
| Çeyreklik pen-test / npm audit | ✅ | `SECURITY_QUARTERLY_CHECKLIST.md` |
| DR evidence hizası | ✅ | `verify-dr-drill-evidence.sh` (VPS) |
| Müşteri due diligence ZIP | ✅ | `pack-customer-due-diligence-mp9.sh` |

**Kabul:** `verify-security-compliance-mp9.sh` PASS · güvenlik dok **≥95%** · ZIP üretilebilir.

---

## MP-10 — Parite kapanış kapısı ✅

**Amaç:** Skor kartındaki tüm **MP hedef** sütunları yeşil.

| Kapı | Durum | Komut |
|------|--------|--------|
| MP-1…MP-9 maturity | ✅ | `vps-operator-verify.sh` |
| Mail/messaging parity wave-2 | ✅ | `run-mail-messaging-parity-wave2-checklist.sh` |
| FS-12 | ✅ | `verify-firma-sohbeti-fs12.sh` |
| Sign-off + skor v2 | ✅ | `MESSAGING_POSTA_MP10_SIGNOFF.md` |

**Kabul:** `verify-messaging-parity-close-mp10.sh` PASS · ürün sign-off dokümanı.

```bash
# Hafif (maturity içinde): MP10_FULL=0
# VPS tam kapı: MP10_FULL=1 bash scripts/verify-messaging-parity-close-mp10.sh
```

---

## Sıradaki adım (operasyon)

MP-0…MP-10 kod ve dok kapanışı tamam. Sürekli izleme: `vps-operator-verify.sh`, çeyreklik `SECURITY_QUARTERLY_CHECKLIST.md`, isteğe bağlı `SKIP_AXE=0` / `SKIP_LIGHTHOUSE=0`.
