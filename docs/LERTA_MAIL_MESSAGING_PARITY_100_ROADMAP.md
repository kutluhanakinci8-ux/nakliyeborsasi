# Lerta — Mail & Mesajlaşma %100 parite yol haritası

**Amaç:** [MAIL_WEBMAIL_UX_BENCHMARK.md](./MAIL_WEBMAIL_UX_BENCHMARK.md) ve mesajlaşma envanterindeki açıkları faz faz kapatmak.  
**Hedef skor:** Her boyutta **≥95/100** (pratik “%100 ürün” — Gmail/Slack’in tüm ekosistem API’leri kapsam dışı).  
**Başlangıç (2026-09-28):** Webmail ~72, sohbet ~58, ESP analitik ~15, bildirim matrisi ~55.

---

## Faz özeti

| Faz | Kod | Odak | Süre (teknik kapsam) | Hedef Δ |
|-----|-----|------|----------------------|---------|
| **PM-1** | `parity-p1` | Mesajlaşma UX: deep link, nav badge, `/messaging` aktif menü | Küçük | Sohbet UX ~62→75% ✅ |
| **PM-2** | `parity-p2` | Yazma: RTE araç çubuğu, org şablon seed (4 adet) | Orta | Yazma 72→85% ✅ kod |
| **PM-3** | `parity-p3` | **S-A4** gönderen/alias hub (`account-hub`) | Orta | Kurumsal 65→85% ✅ kod |
| **PM-4** | `parity-p4` | PWA shell v6, `verify-mail-web-push-prod.sh` | Orta | Mobil 68→78% 🔄 ops |
| **PM-5** | `parity-p5` | `.Junk` maildir, klasör iskeleti, `imap-health`, Dovecot runbook | Büyük | IMAP 62→82% ✅ kod · VPS doğrula |
| **PM-6** | `parity-p6` | **SSE** canlı sohbet (`/messaging/stream`) + polling yedek | Büyük | Canlılık 25→88% ✅ |
| **PM-7** | `parity-p7` | Sohbet: 10 MB×5 ek, admin `message-threads/export` | Orta | Ekler/eDisc ✅ |
| **PM-8** | `parity-p8` | `GET me/notification-preferences/matrix` + profil olay tablosu | Büyük | Matris 55→85% ✅ kod |
| **PM-9** | `parity-p9` | `MailAiComposeService`, yanıt öner, `integration-status` | Büyük | Akıllı 35→70% ✅ kod · LLM ops |
| **PM-10** | `parity-p10` | Admin analitik etiketleri; `integration-status` JMAP köprü bilgisi | Büyük | Analitik panel ✅ · webhook derinlik sırada |

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
| Webmail boyut skorları | `MAIL_WEBMAIL_UX_BENCHMARK.md` güncelle |
| Mesajlaşma checklist | Bu dosyada faz ✅ |
| Admin ESP | `MAIL_ADMIN_BENCHMARK_REPORT.md` B/C boyutları |

## Deploy kaydı

| Tarih | Dal | Not |
|-------|-----|-----|
| 2026-09-28 | `cursor/mail-messaging-parity-100-519e` → **main** (#129) | VPS deploy OK · checklist PASS · push VAPID OK · PM-5 maildir iskeleti `nakliyeborsasi@lerta.com.tr` · Dovecot passwd sync → org IMAP rotate + admin sync |

**Sıradaki ops:** PM-5 `provision-pm5-imap-dovecot-vps.sh` (deploy ile) · PM-4 push abonelik testi · `LERTA_MAIL_AI_COMPOSE_ENABLED` opsiyonel.
