# Lerta — Mail & Mesajlaşma %100 parite yol haritası

**Amaç:** [MAIL_WEBMAIL_UX_BENCHMARK.md](./MAIL_WEBMAIL_UX_BENCHMARK.md) ve mesajlaşma envanterindeki açıkları faz faz kapatmak.  
**Hedef skor:** Her boyutta **≥95/100** (pratik “%100 ürün” — Gmail/Slack’in tüm ekosistem API’leri kapsam dışı).  
**Başlangıç (2026-09-28):** Webmail ~72, sohbet ~58, ESP analitik ~15, bildirim matrisi ~55.

---

## Faz özeti

| Faz | Kod | Odak | Süre (teknik kapsam) | Hedef Δ |
|-----|-----|------|----------------------|---------|
| **PM-1** | `parity-p1` | Mesajlaşma UX: deep link, nav badge, `/messaging` aktif menü | Küçük | Sohbet UX ~62→75% |
| **PM-2** | `parity-p2` | Yazma: TipTap/ProseMirror RTE, şablon kitaplığı, inline resim | Orta | Yazma 72→88% |
| **PM-3** | `parity-p3` | **S-A4** gönderen/alias hub, marka önizleme, çoklu kimlik | Orta | Kurumsal 65→88% |
| **PM-4** | `parity-p4` | PWA: manifest, offline okuma önbelleği, push runbook + VAPID prod | Orta | Mobil 68→85% |
| **PM-5** | `parity-p5` | IMAP çift yön (klasörler, bayraklar), CalDAV/CardDAV senkron derinliği | Büyük | IMAP/takvim 62→90% |
| **PM-6** | `parity-p6` | **WebSocket** sohbet (+ isteğe bağlı mail “yeni mesaj” ping) | Büyük | Canlılık 25→92% |
| **PM-7** | `parity-p7` | Sohbet: ek limitleri (10 MB×5), MIME genişletme, admin chat eDiscovery export | Orta | Ekler 70→90%, eDisc 45→88% |
| **PM-8** | `parity-p8` | Bildirim matrisi (olay×kanal×rol), çeviri prod, push UX (izin/hata/abonelik) | Büyük | Push 65→90%, matris 55→90% |
| **PM-9** | `parity-p9` | Akıllı: kurallar G5+ (OR, koşul önizleme), AI özet/yanıt önerisi (opsiyonel LLM) | Büyük | Akıllı 35→80% |
| **PM-10** | `parity-p10` | ESP analitik (açılma/tıklama/bounce webhook), JMAP genişletme veya tam sunucu kararı | Büyük | Analitik 15→85% |

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

**Sonraki commit:** PM-1 kod · sonra PM-2 compose spike.
