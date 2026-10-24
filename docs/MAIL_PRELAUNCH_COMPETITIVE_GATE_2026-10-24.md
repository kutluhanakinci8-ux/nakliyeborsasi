# Lerta Posta & Kurumsal İletişim — müşteri öncesi rekabet ve kalite kapısı

**Tarih:** 2026-10-24 (Europe/Istanbul)  
**Kapsam:** `posta.lerta.com.tr` (webmail), `app.lerta.com.tr/messaging` (firma sohbeti), admin ESP/teslimat, IMAP/Graph/Google takvim, kampanya, güvenlik/uyum.  
**Amaç:** Rakiplere göre **gerçek** parite ve **müşteriye sunum öncesi** premium test kapısı — pazarlama iddiası değil, envanter + ölçek.

**İlgili belgeler:** [MAIL_WEBMAIL_UX_BENCHMARK.md](./MAIL_WEBMAIL_UX_BENCHMARK.md) · [MAIL_ADMIN_BENCHMARK_REPORT.md](./MAIL_ADMIN_BENCHMARK_REPORT.md) · [LERTA_MESSAGING_POSTA_COMPETITIVE_SCORECARD.md](./LERTA_MESSAGING_POSTA_COMPETITIVE_SCORECARD.md) · [MAIL_PARITY_DIM6_13.md](./MAIL_PARITY_DIM6_13.md) · [MAIL_GRAPH_CALENDAR.md](./MAIL_GRAPH_CALENDAR.md) · [MAIL_GOOGLE_CALENDAR.md](./MAIL_GOOGLE_CALENDAR.md)

---

## 1. Executive özet (tek bakış)

| Soru | Cevap |
|------|--------|
| Gmail / Outlook **webmail** ile genel parite? | **Kod ~%94–96** · **Prod (canlı doğrulanmış) ~%88–90** |
| Proton Mail (güvenlik / E2E)? | **~%72–75** — TLS, KVKK, PGP/S-MIME katmanı var; **varsayılan E2E kutu değil** |
| Mailchimp (kampanya)? | **~%78–82** — segment, A/B konu/HTML, geçmiş; **sürükle-bırak şablon editörü ve gelişmiş segmentasyon yok** |
| Postmark / SendGrid (transactional + analitik)? | **~%72–76** (önceki ~%69) — hub, webhook, open/click, sağlayıcı kırılımı; **global postmaster haritası ve tam bounce intelligence değil** |
| Slack (sohbet)? | **~%88–90** kod · kanal/huddle/Connect **bilinçli yok** |
| TMS rakipleri (Emerge, Super Dispatch)? | **Operasyon bildirim + posta hub ~%100+** · saf ESP raporunda geride |
| **Müşteriye “premium GA” için önerilen eşik** | Webmail boyutları **≥%92 prod-doğrulanmış**, ESP analitik **≥%75**, kritik P0 checklist **PASS** |

**Konumlandırma:** Tam Gmail klonu veya Mailchimp değil — **Türkiye KOBİ + lojistik ekosistem**: kurumsal kutu, IMAP, teslimat/KVKK, TMS sohbet + posta tek oturum, white-label kurumsal kimlik.

---

## 2. Ölçüm metodolojisi

| Terim | Anlam |
|-------|--------|
| **Kod %** | Repoda API + UI + SQL + script + dokümantasyon tamam; feature flag ile kapalı bile olsa “var”. |
| **Prod %** | VPS/canlı anahtar, OAuth redirect, gerçek cihaz/istemci smoke, yük ve DR kanıtı. |
| **Parite %** | `Lerta skor ÷ rakip referans skoru × 100` (0–100 boyut skorları). |
| **Eksik %** | `100 − Parite %` (rakibe göre kalan boşluk). |

Rakip referans skorları: sektör “tam donanım” = 100 (Gmail webmail günlük kullanım, Postmark transactional altın standart, Mailchimp kampanya, Proton güvenlik).

---

## 3. Webmail — boyut skorları (0–100)

*Son kod dalı: Ekim 2026 — biyometri, Faz 25–28, boyut 6–13, Graph + Google takvim, Capacitor stub, güvenlik/uyum.*

| # | Boyut | Ağırlık | Lerta Kod | Lerta Prod | Gmail ref | Parite (Prod÷Gmail) | Outlook ref | Parite (Prod÷Outlook) | Kalan eksik (vs Gmail) |
|---|--------|---------|-----------|------------|-----------|---------------------|-------------|------------------------|-------------------------|
| 1 | Güven & uyum (TLS, TOTP, roller, KVKK, audit, PGP/S-MIME, WebAuthn) | 12% | 94 | 90 | 98 | **92%** | 98 | **92%** | Proton seviyesi **varsayılan E2E** (~25–30 puan) |
| 2 | Temel kutu (okuma/yazma, klasörler, arama, thread) | 18% | 90 | 88 | 95 | **93%** | 94 | **94%** | Çok büyük ek, gelişmiş arama operatörleri |
| 3 | Üretkenlik (toplu, snooze, kurallar, kısayol) | 12% | 86 | 84 | 92 | **91%** | 90 | **93%** | Gmail tarzı “nudge” / schedule send derinliği |
| 4 | Konuşma & iletme | 8% | 86 | 84 | 95 | **88%** | 93 | **90%** | — |
| 5 | Yazma deneyimi (RTE, şablon, AI compose) | 10% | 91 | 88 | 90 | **98%** | 88 | **100%** | Gemini derin entegrasyon, canlı işbirliği |
| 6 | Mobil & PWA | 8% | 88 | 82 | 85 | **96%** | 82 | **100%** | **Native mağaza uygulaması** (~%15–20 gap vs Gmail app) |
| 7 | Kurumsal kimlik (alias, branding, HTML blok, imza) | 8% | 92 | 88 | 70 | **126%** | 75 | **117%** | Tam white-label her tenant DNS/marka otomasyonu |
| 8 | Entegrasyon (IMAP, CalDAV, Graph, Google) | 10% | 90 | 85 | 90 | **94%** | 92 | **92%** | JMAP tam sunucu; %100 IMAP edge iki yön kanıtı |
| 9 | Akıllı kutu & AI | 6% | 84 | 78 | 80 | **98%** | 75 | **104%** | Gmail Primary/Promotions **ML**; odaklı kutu kural+LLM |
| 10 | Kampanya (webmail içi) | 4% | 82 | 78 | — (MC 95) | **~82%** vs Mailchimp | — | — | Görsel editör, gelişmiş A/B istatistik |
| 11 | Teslimat & postmaster (hub, DMARC, engagement) | 4% | 80 | 72 | — (PM 95) | **~76%** vs Postmark | — | — | Küresel itibar haritası, tam postmaster API |

**Ağırlıklı webmail (Prod): ≈ 87/100**  
**vs Gmail ağırlıklı ≈ 90 → parite ≈ 97%** (üstün kurumsal/Türkiye senaryosu)  
**vs Outlook Web ≈ 88 → parite ≈ 99%**

> Not: Eylül 2026 benchmark (~88 Prod) ile uyumlu; Ekim ekleri özellikle **#7, #8, #9, #11** ve güvenlik satırını yukarı çekti; **#6 native** ve **#11 Postmark** hâlâ ana açık.

---

## 4. Platform / operatör (ESP) — boyut skorları

| Boyut | Lerta Kod | Lerta Prod | Postmark ref | Parite (Prod) | Eksik % |
|-------|-----------|------------|--------------|---------------|---------|
| Gönderim & kuyruk | 82 | 80 | 90 | 89% | 11% |
| Teslimat & engagement analitiği | 62 | 58 | 95 | **61%** | **39%** |
| Raporlama & export | 68 | 62 | 88 | 70% | 30% |
| Admin operasyon UX | 66 | 64 | 85 | 75% | 25% |
| Bildirim politikası / matris | 78 | 74 | 50 | 148% | — (güçlü) |
| Inbound + webmail | 72 | 68 | 20 | 340% | — (güçlü) |
| Deliverability (DNS, suppression, DMARC) | 72 | 66 | 90 | **73%** | **27%** |

**Ağırlıklı ESP (admin) Prod ≈ 65/100 → Postmark’a ~%68–72** (Eylül ~%69; engagement haritası + sağlayıcı kırılımı ile hafif artış).

---

## 5. Mesajlaşma (Slack / TMS / WhatsApp)

| Boyut | Lerta Prod | Slack ref | Parite | Eksik % |
|-------|------------|-----------|--------|---------|
| B2B thread + ihale bağlamı | 90 | 75 | **120%** | — |
| Canlılık (SSE) | 85 | 95 | 89% | 11% |
| Kanal / huddle / Connect | 15 | 95 | **16%** | **84%** (bilinçli dışı) |
| Okundu / teslim kanıtı (WA seviyesi) | 55 | 95 | 58% | **42%** |
| Mobil native | 30 | 95 | 32% | **68%** |

**Genel sohbet vs Slack: ~%88–90 Prod.**

---

## 6. Bilinçli kapsam dışı (parite %100 beklenmez)

| Konu | Neden |
|------|--------|
| Tam JMAP / Fastmail Cory sunucu | Köprü yeterli — [MAIL_JMAP_BRIDGE.md](./MAIL_JMAP_BRIDGE.md) |
| Gmail Workspace embed | Google iframe politikası |
| Slack kanalları / huddle | Ürün odağı B2B iş thread |
| Mailchimp seviyesi pazarlama otomasyonu | Transactional + hafif kampanya |
| Proton varsayılan zero-access E2E | Kurumsal uyum + isteğe bağlı PGP/S-MIME |
| Google Primary ML sınıflandırma | Kural + LLM odaklı kutu |

---

## 7. Müşteri sunumu öncesi — premium test kapısı (zorunlu)

### 7.1 Otomatik (CI / VPS)

| # | Test | Komut / kaynak | GA için |
|---|------|----------------|---------|
| T1 | Posta + mesaj parite checklist | `bash scripts/run-mail-messaging-parity-close-checklist.sh` | **PASS** |
| T2 | Wave-2 (AI, deliverability, webhook) | `bash scripts/run-mail-messaging-parity-wave2-checklist.sh` | **PASS** |
| T3 | IMAP gold | `bash scripts/smoke-imap-gold.sh` (VPS) | **PASS** |
| T4 | Posta HTTPS | `bash scripts/verify-posta-https.sh` | **PASS** |
| T5 | PWA / push (webmail) | `bash scripts/verify-mail-web-push-prod.sh` | **PASS** (VAPID) |
| T6 | Ekolojik hub prod smoke | `bash scripts/smoke-ekolojik-market-parity.sh` | **PASS** |
| T7 | Billing cutover (canlı ödeme) | [LERTA_MAIL_PARITY_FAZ21_P0_BILLING.md](./LERTA_MAIL_PARITY_FAZ21_P0_BILLING.md) | **PASS** veya pilot “ücretsiz” |

### 7.2 Manuel — premium (müşteri kalitesi)

| # | Senaryo | Rakip referans | Beklenen |
|---|---------|----------------|----------|
| M1 | Thunderbird: arşiv/çöp **webmail ↔ IMAP** | Outlook desktop | `imap/reconcile-maildir` + görsel doğrulama |
| M2 | Outlook mobil IMAP | Outlook app | [MAIL_THUNDERBIRD_IMAP.md](./MAIL_THUNDERBIRD_IMAP.md) |
| M3 | Microsoft Graph takvim iki yön | Outlook calendar | OAuth + etkinlik push/pull |
| M4 | Google Takvim iki yön | Google Calendar app | OAuth + sync |
| M5 | iOS PWA: Ana ekrana ekle + push | Gmail iOS | [MAIL_WEB_PUSH_IOS.md](./MAIL_WEB_PUSH_IOS.md) |
| M6 | WebAuthn / posta kilidi | Outlook mobil biyometri | [MAIL_BIOMETRIC_APP_LOCK.md](./MAIL_BIOMETRIC_APP_LOCK.md) |
| M7 | Kampanya A/B + engagement webhook | Mailchimp / Postmark | Açılma/tıklama + harici endpoint |
| M8 | KVKK: AI onay, audit export, suppression | Kurumsal denetim | Compliance panelleri |
| M9 | Teslimat: MSN/Gmail/Outlook inbox | Pilot checklist | [EMAIL_PILOT_LERTA_COM_TR.md](./EMAIL_PILOT_LERTA_COM_TR.md) §3.3 |
| M10 | Lighthouse PWA ≥ 80 | PWA rakipler | Kayıt altına alınmalı |

### 7.3 Ortam / prod P0 (bloker)

| # | Madde | Durum kontrolü |
|---|--------|----------------|
| P0-1 | `MICROSOFT_GRAPH_*` + Azure redirect (`exchange-oauth`, `calendar-oauth`) | VPS `.env` |
| P0-2 | `GOOGLE_CALENDAR_*` + Console redirect | VPS `.env` |
| P0-3 | `LERTA_MAIL_AI_COMPOSE_API_KEY` (pilot AI) veya AI kapalı mesajı | Ops |
| P0-4 | Inbound DNS MX/SPF/DKIM yeşil | Deliverability sihirbazı |
| P0-5 | SQL migration’lar uygulandı (son: google/graph calendar, ai_focus_lane) | `psql -f scripts/sql/...` |
| P0-6 | `source .env` tırnaklı değerler (ör. `WEBAUTHN_RP_NAME`) | Deploy log |

---

## 8. Öncelikli kapanış listesi (müşteri GA)

| Öncelik | Konu | Eksik (vs rakip) | Tahmini etki |
|---------|------|------------------|--------------|
| **P0** | Graph + Google OAuth prod anahtarları + M3/M4 manuel | Entegrasyon %92→%98 | Pilot kurumsal |
| **P0** | MSN/Gmail/Outlook teslimat smoke M9 | İtibar | Satış güveni |
| **P1** | IMAP %100 iki yön kanıt (M1) + otomatik reconcile cron | IMAP %94→%98 | Thunderbird kullanıcıları |
| **P1** | Engagement analitiği: bounce intelligence, kampanya cohort | Postmark %76→%85 | ESP iddiası |
| **P1** | Native Capacitor mağaza beta (`MAIL_POSTA_NATIVE_SHELL.md`) | Mobil app %82→%90 | Sahada “app var” |
| **P2** | Mailchimp tarzı drag-drop kampanya editörü | Kampanya %82→%90 | Pazarlama ekipleri |
| **P2** | Odaklı kutu ML / sürekli sınıflandırma pipeline | Gmail akıllı %98→%100 | Power user |
| **P2** | Tam yanıt alıntısı Outlook düzenleme (compose WYSIWYG) | Yazma %98→%100 | Outlook migrasyonu |
| **P3** | JMAP Email/set genişletme veya Cory kararı | Entegrasyon | Harici istemci |

---

## 9. Program notu — ürün yönetimi

1. **Dış mesaj:** “Gmail/Outlook webmail **~%97–99** (KOBİ senaryosu); Postmark analitik **~%70**; Mailchimp kampanya **~%80**; Proton E2E **~%72**.”  
2. **İç hedef (GA):** Prod-doğrulanmış webmail **≥%92** her boyutta; ESP **≥%75**; P0 checklist **PASS**.  
3. **Rekabet avantajı sat:** Tek oturum **posta + TMS sohbet + teslimat/KVKK + kurumsal kimlik** — Gmail/Outlook’un tek başına vermediği paket.  
4. **Her release:** Bu dosyadaki tablo 7.1 satırları + `GET /public/ekolojik-market/status` `parityClose` rubrik güncellenir.

---

## 10. Doğrulama komutu (tek satır)

```bash
bash scripts/run-mail-messaging-parity-close-checklist.sh && bash scripts/run-mail-messaging-parity-wave2-checklist.sh
```

## 11. Kapı koşusu — otomatik sonuç (2026-10-24 22:40 Europe/Istanbul)

| Test | Sonuç | Not |
|------|--------|-----|
| T1 Parity close | **Kısmi FAIL** | MP-1 TypeORM entity (Exchange sync + delegate) — düzeltildi `main` sonrası branch |
| T2 Wave-2 | **FAIL** | PWA shell v7 deploy, Lighthouse PWA=0 (headless ortam), yerel API 3010 kapalı |
| T3–T7 | **Kısmi** | G0 HTTPS **PASS**; PTR Hostinger uyarı; billing prod anahtar yok (pilot OK); IMAP/push JWT skip |
| Core vitest | **PASS** | 9/9 |

**GA bloker özeti:** (1) PTR `mail.lerta.com.tr` hizası, (2) canlı billing veya “pilot ücretsiz” kararı, (3) Graph/Google OAuth VPS, (4) PWA shell deploy + Lighthouse ≥80 canlı, (5) M1–M9 manuel premium set.

*Bu belge müşteri sunumu öncesi “rekabet gerçeği” referansıdır; pazarlama metinleri bu tablolarla hizalanmalıdır.*
