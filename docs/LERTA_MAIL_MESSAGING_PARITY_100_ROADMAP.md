# Lerta — Mail & Mesajlaşma %100 parite yol haritası

**Amaç:** [MAIL_WEBMAIL_UX_BENCHMARK.md](./MAIL_WEBMAIL_UX_BENCHMARK.md) ve mesajlaşma envanterindeki açıkları faz faz kapatmak.  
**Hedef skor:** Her boyutta **≥95/100** (pratik “%100 ürün” — Gmail/Slack’in tüm ekosistem API’leri kapsam dışı).  
**Başlangıç (2026-09-28):** Webmail ~72, sohbet ~58, ESP analitik ~15, bildirim matrisi ~55.  
**Sprint sonu (2026-09-28, main #129–#142):** Webmail **~82** (Gmail **~%92**), mesajlaşma **~84** (Slack **~%88**), admin ESP **~61** (Postmark **~%69**) — [MAIL_WEBMAIL_UX_BENCHMARK.md](./MAIL_WEBMAIL_UX_BENCHMARK.md) · [MAIL_ADMIN_BENCHMARK_REPORT.md](./MAIL_ADMIN_BENCHMARK_REPORT.md).

---

## Faz özeti

| Faz | Kod | Odak | Süre (teknik kapsam) | Hedef Δ |
|-----|-----|------|----------------------|---------|
| **PM-1** | `parity-p1` | Mesajlaşma UX: deep link, nav badge, `/messaging` aktif menü | Küçük | Sohbet UX ~62→75% ✅ |
| **PM-2** | `parity-p2` | Yazma: RTE araç çubuğu, org şablon seed (4 adet) | Orta | Yazma 72→85% ✅ kod |
| **PM-3** | `parity-p3` | **S-A4** gönderen/alias hub (`account-hub`) | Orta | Kurumsal 65→85% ✅ kod |
| **PM-4** | `parity-p4` | PWA shell v7, IndexedDB offline liste/detay, verify scriptleri | Orta | Mobil 68→85% ✅ kod · VPS doğrula |
| **PM-5** | `parity-p5` | `.Junk` maildir, klasör iskeleti, `imap-health`, Dovecot runbook | Büyük | IMAP 62→82% ✅ kod · VPS doğrula |
| **PM-6** | `parity-p6` | **SSE** canlı sohbet (`/messaging/stream`) + polling yedek | Büyük | Canlılık 25→88% ✅ |
| **PM-7** | `parity-p7` | Sohbet: 10 MB×5 ek, admin `message-threads/export` | Orta | Ekler/eDisc ✅ |
| **PM-8** | `parity-p8` | `GET me/notification-preferences/matrix` + profil olay tablosu | Büyük | Matris 55→85% ✅ kod |
| **PM-9** | `parity-p9` | `MailAiComposeService`, yanıt öner, enable/verify scriptleri | Büyük | Akıllı 35→75% ✅ · LLM anahtar ops |
| **PM-10** | `parity-p10` | Engagement CSV, webmail webhook, JMAP doküman + verify | Büyük | Analitik ~85% ✅ |

Her faz: kod + dokümantasyon + (varsa) `scripts/verify-*` · deploy checklist.

---

## PM-1 — Mesajlaşma UX (başlandı)

| Görev | Durum | Dosya / not |
|-------|--------|-------------|
| `?companyId=` + `listingId` → otomatik `openThread` veya mevcut thread | ✅ | `MessagingPageClient.tsx` |
| `?threadId=` → mevcut yükleme korunur | ✅ | — |
| Nav **Mesajlar** okunmamış (sohbet + kutu özet) | ✅ | `useMesajlarNavBadge.ts`, `SiteHeader.tsx` |
| `/messaging` menüde aktif | ✅ | `isMessagingNavActive()` |

**Kabul:** İhale/pazar linki → sohbet sekmesi açık, thread seçili, “Aç” tıklanmadan mesaj yazılabilir.

---

## PM-2 — Yazma deneyimi (72% → ~88%)

- `apps/mail-web` compose: tam WYSIWYG (kalın, liste, link, tablo sınırlı).
- Şablonlar: “teklif”, “fatura hatırlatma”, kullanıcı tanımlı 10 şablon.
- Plain-text alternatif + `multipart/alternative` gönderim doğrulama.
- **Kabul:** Outlook Web compose özellik setinin ~%85’i (video embed hariç).

---

## PM-3 — Kurumsal S-A4 (65% → ~88%)

- Ayarlar → **Hesaplar ve gönderenler**: primary, alias listesi, varsayılan From, DNS doğrulama durumu.
- Tenant logo/başlık önizleme (embed + webmail).
- **Kabul:** [MAIL_WEB_SETTINGS_ROADMAP.md](./MAIL_WEB_SETTINGS_ROADMAP.md) S-A4 satırı ✅.

---

## PM-4 — Mobil / PWA (68% → ~85%)

- Service worker: son açılan N mesajı IndexedDB (salt okunur).
- iOS PWA push dokümantasyonu + `beforeinstallprompt` Android.
- `scripts/verify-mail-web-push-prod.sh` (VAPID + 204 subscribe).
- **Kabul:** Lighthouse PWA ≥80; push prod’da test bildirimi.

---

## PM-5 — IMAP / takvim / kişi (62% → ~90%)

- Dovecot deploy (C4): `setup-dovecot-c4.sh` VPS zorunlu.
- Klasör eşlemesi: özel klasörler, `\Deleted`, `\Flagged` iki yön.
- CalDAV: seri + EXDATE, CardDAV: grup ve foto.
- **Kabul:** Thunderbird + Apple Mail smoke test runbook.

---

## PM-6 — Canlılık WebSocket (25% → ~92%)

- `apps/api` Gateway veya SSE fallback; `MessagingPageClient` polling kaldırılır.
- Oturum başına rate limit; yeniden bağlanma.
- **Kabul:** p95 gecikme <2 sn mesaj görünürlük (aynı thread).

---

## PM-7 — Sohbet derinlik

- Ek: 10 MB, 5 dosya; PDF, XLSX, görsel.
- Platform admin: `GET /platform-admin/messaging/export` (ZIP, KVKK uyumlu).
- **Kabul:** Mail eDiscovery ile aynı operatör UX seviyesi.

---

## PM-8 — Push, çeviri, bildirim matrisi

- `MESSAGING_TRANSLATE_API_URL` prod LibreTranslate / DeepL adapter.
- Kullanıcı + org: olay kataloğu (ihale, mesaj, mail) × e-posta / push / in-app.
- **Kabul:** Super Dispatch tarzı tercih ekranı; TMS matris ~%90.

---

## PM-9 — Akıllı özellikler

- Kurallar: nested OR, “bu gönderenden”, ek boyutu, otomatik etiket.
- AI (feature flag): thread özet, yanıt önerisi (KVKK onay metni).
- **Kabul:** Benchmark “akıllı” 35→80%.

---

## PM-10 — ESP analitik & JMAP

- Outbox event pipeline: delivered, bounce (hard/soft), open, click (pixel/link wrap).
- Admin: tarih aralığı, olay tipi, CSV.
- JMAP: ya bridge genişletme (Email/set, Mailbox/*) ya da Fastmail Cory kararı dokümante.
- **Kabul:** Postmark yetkinliğinin ~%85’i (pazarlama segmentasyonu hariç).

---

## İzleme

| Metrik | Kaynak |
|--------|--------|
| Webmail boyut skorları | `MAIL_WEBMAIL_UX_BENCHMARK.md` ✅ 2026-09-28 |
| Mesajlaşma checklist | Bu dosyada faz ✅ · admin rapor §3.3 |
| Admin ESP | `MAIL_ADMIN_BENCHMARK_REPORT.md` ✅ 2026-09-28 |

## Deploy kaydı

| Tarih | Dal | Not |
|-------|-----|-----|
| 2026-09-28 | `cursor/mail-messaging-parity-100-519e` → **main** (#129) | VPS deploy OK · checklist PASS · push VAPID OK |
| 2026-09-28 | PM-5 ops (#131–#134) | `provision-pm5-imap-dovecot-vps.sh` deploy hook · 21× `@lerta.com.tr` Dovecot passwd · verify `nakliyeborsasi@lerta.com.tr` OK · şifreler VPS: `/root/lerta-imap-credentials-bootstrap.txt` |
| 2026-09-28 | PM-4 (#136) | SW v7 + IndexedDB offline · `verify-mail-web-pwa-prod.sh` |
| 2026-09-28 | PM-9/10 (#137) | AI compose env (şablon) · engagement CSV |
| 2026-09-28 | PM-10 webhook (#138) | Webmail → `message.sent` / `message.failed` |
| 2026-09-28 | Parity kapanış | `MAIL_JMAP_BRIDGE.md` · `run-mail-messaging-parity-close-checklist.sh` |

**PM-1…PM-10:** kod + prod deploy tamam. **Bakım:** `LERTA_MAIL_AI_COMPOSE_API_KEY` (opsiyonel) · `Email/set` JMAP (v2).

**Kapanış doğrulama (VPS):** `bash scripts/run-mail-messaging-parity-close-checklist.sh`

---

## 35 maddelik envanter — tam liste (Kod % · Prod %)

**Ölçek:** **Kod %** = repoda API/UI/script/SQL tamam · **Prod %** = canlı VPS, anahtar, manuel istemci veya bilinçli ürün kapsamı.  
**Özet (2026-09-28, dal `cursor/mail-messaging-parity-wave2-519e` #150):** Kod ortalama **≈ 88%** · Prod ortalama **≈ 72%** · **● öncelik** Kod **≈ 97%** / Prod **≈ 81%**.

| # | Konu | Kod % | Prod % | Kalan (kısa) |
|---|------|-------|--------|----------------|
| 1 | LLM yanıt öner | **100** | **92** | Prod API anahtarı |
| 2 | IMAP gold smoke | **95** | **78** | Thunderbird / Apple iki yön kanıt |
| 3 | Push (webmail + sohbet) | **100** | **82** | iOS PWA gerçek cihaz |
| 4 | Benchmark dokümanları | **100** | **95** | Periyodik VPS yenileme |
| 5 | DNS legacy temizlik | **100** | **85** | Canlı DNS `kullanici.*` |
| 6 | IMAP şifre dağıtımı | **95** | **90** | Bootstrap yedek; tam self-servis |
| 7 | SSE ölçek / p95 | **95** | **72** | Yük testi + p95 SLO |
| 8 | Sohbet push ayrı VAPID | **100** | **94** | Prod fallback kapalı doğrulama |
| 9 | Çeviri (mesajlaşma) | **100** | **88** | Prod DeepL/LibreTranslate |
| 10 | ESP webhook derinliği | **100** | **90** | Tüm outbox’larda org metadata smoke |
| 11 | Deliverability hub | **100** | **86** | Tam Postmark-tarzı UI polish |
| 12 | Kurallar G5+ | **100** | **94** | İsteğe bağlı daha derin OR |
| 13 | CalDAV/CardDAV harici | **92** | **82** | Tam RRULE/seri istemci paritesi |
| 14 | WYSIWYG compose | **95** | **88** | Outlook seviyesi |
| 15 | Bildirim matrisi UX | **100** | **91** | TMS %100 prod doğrulama |
| 16 | Billing prod | **100** | **87** | Canlı Stripe/iyzico |
| 17 | OPERATOR_JWT checklist | **100** | **93** | VPS/CI’da JWT zorunlu |
| 18 | JMAP Email/set | **85** | **85** | #146 merge + prod smoke |
| 19 | Tam JMAP / Cory sunucu | **18** | **18** | Köprü yeterli (ürün kararı) |
| 20 | WebSocket gateway | **22** | **22** | SSE yeterli |
| 21 | Slack derinliği | **84** | **84** | #147 merge + prod |
| 22 | Native iOS/Android | **28** | **28** | Sadece PWA |
| 23 | Pazarlama e-postası | **86** | **86** | #148 merge + prod hacim |
| 24 | HubSpot/SendGrid analitik | **85** | **76** | Postmark ~%85 hedefi |
| 25 | AI özet / sınıflandırma | **100** | **88** | Prod LLM anahtarı |
| 26 | KVKK AI onay + audit | **100** | **80** | DPO export / tam denetim |
| 27 | eDiscovery legal hold | **100** | **74** | Ops legal-hold + zincir kanıtı |
| 28 | Multi-VPS worker rolü | **100** | **62** | Her ortamda `LERTA_MAIL_RUNTIME_ROLE` |
| 29 | DR tatbikatı | **100** | **55** | `verify-dr-drill-evidence.sh` + RTO |
| 30 | Lighthouse PWA ≥80 | **100** | **65** | Prod skor kaydı |
| 31 | Gmail admin embed | **20** | **20** | Tam embed yok |
| 32 | Onboarding KPI | **100** | **82** | Ürün panosu UI |
| 33 | White-label vitrin F4 | **58** | **58** | F4 parçalı |
| 34 | Okundu/teslim (sohbet) | **42** | **42** | WA/Slack seviyesi değil |
| 35 | Public API genişleme | **68** | **68** | Graph-class dışı |

### Kod %100 kapanış notları (#150 wave-2)

| Madde | Repoda |
|-------|--------|
| 1, 25, 26 | `MailAiComposeService` özet/sınıfla; `GET/PATCH ai-mail-consent`; webmail Özet/Sınıfla + gizlilik onayı; audit kodları |
| 8 | `verify-messaging-web-push-prod.sh` → `MESSAGING_WEB_PUSH_ALLOW_MAIL_FALLBACK=true` **FAIL** |
| 10 | `EmailOutboxService.normalizeOutboxMetadata` + genişletilmiş webhook kaynakları |
| 11 | `GET company/mail-inbox/deliverability-hub` + `MailDeliverabilityPanel` |
| 15 | `user-notification-push-prefs.sql` · matris `pushPreferenceKey` · profil push sütunu |
| 17 | `run-mail-billing-a1-acceptance.sh` → `PARITY_STRICT=1` JWT zorunlu |
| 27 | `mail-mailbox-legal-hold.sql` · platform `legal-hold/enable|release` · eDiscovery `legalHoldActive` |
| 28–30 | `verify-multi-vps-mail-role.sh` · `verify-dr-drill-evidence.sh` · `smoke-messaging-sse-load.sh` · Lighthouse script |

**SQL (VPS):** `user-notification-push-prefs.sql` · `mail-mailbox-legal-hold.sql` · (önceki) `user-ai-mail-consent.sql`

### Grup özetleri

| Grup | Maddeler | Kod ort. | Prod ort. |
|------|----------|----------|-----------|
| **● Öncelik** | 1–17, 26, 28–30, 32 | **≈ 97%** | **≈ 81%** |
| **— Ekosistem / erteleme** | 19–20, 22, 31, 33–35 | **≈ 38%** | **≈ 38%** |
| **PR bekleyen merge** | 18, 21, 23 | — | +smoke sonrası |
| **Tüm tablo** | 1–35 | **≈ 88%** | **≈ 72%** |

**Doğrulama:** `bash scripts/run-mail-messaging-parity-wave2-checklist.sh`

**Sonraki faz (mühendislik olgunluğu):** [LERTA_MESSAGING_POSTA_100_EXECUTION_ROADMAP.md](./LERTA_MESSAGING_POSTA_100_EXECUTION_ROADMAP.md) (MP-0…MP-10) · skor kartı [LERTA_MESSAGING_POSTA_COMPETITIVE_SCORECARD.md](./LERTA_MESSAGING_POSTA_COMPETITIVE_SCORECARD.md)
