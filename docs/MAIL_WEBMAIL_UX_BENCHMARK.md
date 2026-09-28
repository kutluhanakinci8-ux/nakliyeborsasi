# Lerta Posta — rakip karşılaştırma (webmail)

**Kapsam:** `posta.lerta.com.tr` (`apps/mail-web`) — günlük kullanım vs Gmail, Outlook Web, Zoho Mail, Proton Mail.  
**Referans ekran:** 3 sütun (sol menü · liste · okuma), pilot `*@lerta.com.tr` kutusu.  
**Son güncelleme:** 2026-09-28 — **PM-1…PM-10** parity sprint (#129–#142), IMAP gold smoke prod, PWA v7.

**Doğrulama:** `bash scripts/run-mail-messaging-parity-close-checklist.sh` · `bash scripts/smoke-imap-gold.sh` (VPS).

---

## 1. Özet skor (webmail UX, 0–100)

| Boyut | Ağırlık | Lerta (sprint sonu) | Gmail | Outlook | vs Gmail | vs Outlook | Not |
|-------|---------|---------------------|-------|---------|----------|------------|-----|
| Güven & TLS | 12% | **90** | 98 | 98 | **92%** | **92%** | Posta HTTPS + IMAP LE `mail.lerta.com.tr` |
| Temel kutu (okuma/yazma) | 20% | **80** | 95 | 94 | **84%** | **85%** | Klasörler, swipe, ek, taslak, arama, snooze |
| Üretkenlik (toplu, kısayol) | 15% | **80** | 92 | 90 | **87%** | **89%** | G2 toplu; G5 yıldız/kurallar; snooze |
| Konuşma & iletme | 10% | **82** | 95 | 93 | **86%** | **88%** | Thread, ilet, tümüne yanıt |
| Yazma deneyimi | 12% | **84** | 90 | 88 | **93%** | **95%** | PM-2: RTE araç çubuğu + org şablonlar |
| Mobil / PWA | 10% | **82** | 85 | 82 | **96%** | **100%** | PM-4: shell v7, IndexedDB offline liste/detay |
| Kurumsal (marka, alias) | 8% | **84** | 70 | 75 | **120%** | **112%** | PM-3: S-A4 gönderen/alias hub |
| Entegrasyon (IMAP, takvim) | 8% | **82** | 90 | 92 | **91%** | **89%** | PM-5: Dovecot gold SPECIAL-USE; D6 takvim/kişi MVP |
| Akıllı özellikler | 5% | **68** | 80 | 75 | **85%** | **91%** | PM-9: şablon AI compose; G5+ kurallar (LLM API opsiyonel) |

**Ağırlıklı Lerta skoru ≈ 82/100** (önceki ≈72).

| Kıyas | Parite (Lerta ÷ rakip ağırlıklı skor) |
|-------|----------------------------------------|
| **vs Gmail (webmail)** | **≈ 92%** (82 ÷ 89) |
| **vs Outlook Web** | **≈ 93%** (82 ÷ 88) |

KOBİ pilot için **üretim hazır webmail**; kalan açık: tam LLM özet, harici CalDAV/CardDAV iki yön, native mobil uygulama.

---

## 2. Özellik matrisi (detay)

| Özellik | Lerta | Gmail | Outlook | Öncelik |
|---------|-------|-------|---------|---------|
| HTTPS + geçerli sertifika | ✓ (G0 + IMAP LE) | ✓ | ✓ | Sürdür |
| Gelen / gönderilen / spam / taslak | ✓ | ✓ | ✓ | — |
| Arşiv / çöp | ✓ | ✓ | ✓ | — |
| Konuşma görünümü | ✓ | ✓ varsayılan | ✓ | — |
| Gelişmiş arama | ✓ | ✓ | ✓ | — |
| Yanıtla / tümüne yanıt | ✓ | ✓ | ✓ | — |
| İlet (forward) | ✓ (G3) | ✓ | ✓ | — |
| BCC alanı | ✓ (G3) | ✓ | ✓ | — |
| Zengin metin compose | ✓ tablo + video embed | ✓ | ✓ | — |
| Toplu seç + sil/arşiv | ✓ (G2) | ✓ | ✓ | — |
| Okundu / okunmadı işaretle | ✓ | ✓ | ✓ | — |
| Yıldız / bayrak | ✓ (G5) | ✓ | ✓ | — |
| Snooze / erteleme | ✓ + toplu (G7) | ✓ | ✓ | — |
| Klavye kısayolları | ✓ (`?`) | ✓ | ✓ | — |
| Depolama kotası çubuğu | ✓ | ✓ | ✓ | — |
| İmza / şablon | ✓ | ✓ | ✓ | — |
| IMAP / şifre döndürme | ✓ + Dovecot sync | ✓ | ✓ | [MAIL_IMAP_GOLD_SMOKE.md](./MAIL_IMAP_GOLD_SMOKE.md) |
| TOTP (webmail) | ✓ | ✓ | ✓ | — |
| Özel klasör / etiket | ✓ (G5) | ✓ | ✓ | — |
| Kurallar / filtre | ✓ G5+ (5 grup, gövde, ek boyutu) | ✓ | ✓ | — |
| Takvim / kişiler | ✓ D6 + CardDAV grup/foto | ✓ | ✓ | Tam RRULE istemci paritesi |
| Web push / ses | ✓ (G6) | ✓ | ✓ | [MAIL_WEB_PUSH_IOS.md](./MAIL_WEB_PUSH_IOS.md) |
| PWA offline okuma | ✓ (PM-4) | kısmi | kısmi | — |
| Karanlık tema | ✓ (G4) | ✓ | ✓ | — |
| Kurumsal logo (tenant) | ✓ (G4) | kısmi | ✓ | — |
| Geri al (undo send) | ✓ (5s) | ✓ | ✓ | — |
| Harici istemci (Thunderbird) | ✓ gold smoke prod | ✓ | ✓ | Manuel arşiv/sil senkron |

---

## 3. Canlı doğrulama

| Kontrol | Aksiyon |
|--------|--------|
| **Güvenli değil** (HTTP) | `https://posta.lerta.com.tr/mail` kullanın; `bash scripts/verify-posta-https.sh` |
| IMAP / Thunderbird | `bash scripts/smoke-imap-gold.sh` · `configure-dovecot-imap-gold-folders.sh` |
| Eski UI | Sidebar **Sürüm** SHA; hard refresh / PWA yeniden aç |
| Push yok (iOS) | [MAIL_WEB_PUSH_IOS.md](./MAIL_WEB_PUSH_IOS.md) — Ana ekrana ekle |

---

## 4. Strateji

Lerta Mail **tam Gmail klonu** olmayacak; hedef: **Türkiye KOBİ + pilot** için güvenilir, sade, IMAP uyumlu kutu. Sprint sonrası **Gmail/Outlook webmail paritesi ~%92–93** bandında.

Rekabet avantajı: **aynı ekosistem** (yonetim DNS, kota, KVKK, TMS mesajlaşma) — bunları webmail içinde **görünür** yapmak (durum, kota, konsol linki).

Uygulama fazları: [MAIL_WEBMAIL_UX_ROADMAP.md](./MAIL_WEBMAIL_UX_ROADMAP.md) · parity: [LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md](./LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md)
