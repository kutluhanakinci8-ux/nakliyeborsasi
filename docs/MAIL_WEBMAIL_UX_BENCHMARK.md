# Lerta Posta — rakip karşılaştırma (webmail)

**Kapsam:** `posta.lerta.com.tr` (`apps/mail-web`) — günlük kullanım vs Gmail, Outlook Web, Zoho Mail, Proton Mail.  
**Referans ekran:** 3 sütun (sol menü · liste · okuma), pilot `kullanici.lerta.com.tr` kutusu.  
**Son güncelleme:** G7 (HTTPS HSTS, snooze, push, kurallar, undo send).

---

## 1. Özet skor (webmail UX, 0–100)

| Boyut | Ağırlık | Lerta (bugün) | Gmail | Outlook | Not |
|-------|---------|---------------|-------|---------|-----|
| Güven & TLS | 12% | **88** | 98 | 98 | G0: HSTS + HTTP→HTTPS; canlıda `verify-posta-https.sh` |
| Temel kutu (okuma/yazma) | 20% | **78** | 95 | 94 | Klasörler, ek, taslak, arama, snooze klasörü |
| Üretkenlik (toplu, kısayol) | 15% | **78** | 92 | 90 | G2 toplu; G5 yıldız/kurallar; snooze + toplu erteleme |
| Konuşma & iletme | 10% | **82** | 95 | 93 | Thread, ilet, tümüne yanıt (To/Cc meta) |
| Yazma deneyimi | 12% | **72** | 90 | 88 | Cc/Bcc, HTML; tam WYSIWYG değil |
| Mobil / PWA | 10% | **68** | 85 | 82 | Paneller + SW; iOS push sadece PWA ([iOS doc](./MAIL_WEB_PUSH_IOS.md)) |
| Kurumsal (marka, alias) | 8% | **65** | 70 | 75 | G4 logo/başlık; alias/IMAP paneli |
| Entegrasyon (IMAP, takvim) | 8% | **50** | 90 | 92 | IMAP; CalDAV/kişi yok (D6) |
| Akıllı özellikler | 5% | **35** | 80 | 75 | Gelen kuralları MVP; AI özet yok |

**Ağırlıklı Lerta skoru ≈ 72/100** — KOBİ pilot için **güçlü MVP**; Gmail/Outlook ile **takvim/kişi + AI** açığı sürer.

---

## 2. Özellik matrisi (detay)

| Özellik | Lerta | Gmail | Outlook | Öncelik |
|---------|-------|-------|---------|---------|
| HTTPS + geçerli sertifika | ✓ (G0) | ✓ | ✓ | Sürdür |
| Gelen / gönderilen / spam / taslak | ✓ | ✓ | ✓ | — |
| Arşiv / çöp | ✓ | ✓ | ✓ | — |
| Konuşma görünümü | ✓ | ✓ varsayılan | ✓ | — |
| Gelişmiş arama | ✓ | ✓ | ✓ | — |
| Yanıtla / tümüne yanıt | ✓ | ✓ | ✓ | — |
| İlet (forward) | ✓ (G3) | ✓ | ✓ | — |
| BCC alanı | ✓ (G3) | ✓ | ✓ | — |
| Zengin metin compose | ✓ (G4) | ✓ | ✓ | RTE iyileştirme |
| Toplu seç + sil/arşiv | ✓ (G2) | ✓ | ✓ | — |
| Okundu / okunmadı işaretle | ✓ | ✓ | ✓ | — |
| Yıldız / bayrak | ✓ (G5) | ✓ | ✓ | — |
| Snooze / erteleme | ✓ + toplu (G7) | ✓ | ✓ | — |
| Klavye kısayolları | ✓ (`?`) | ✓ | ✓ | — |
| Depolama kotası çubuğu | ✓ | ✓ | ✓ | — |
| İmza / şablon | ✓ | ✓ | ✓ | — |
| IMAP / şifre döndürme | ✓ | ✓ | ✓ | — |
| TOTP (webmail) | ✓ | ✓ | ✓ | — |
| Özel klasör / etiket | ✓ (G5) | ✓ | ✓ | — |
| Kurallar / filtre | ✓ MVP (G5) | ✓ | ✓ | G5+ derinleştirme |
| Takvim / kişiler | ✗ | ✓ | ✓ | D6 |
| Web push / ses | ✓ (G6) | ✓ | ✓ | iOS PWA doc |
| Karanlık tema | ✓ (G4) | ✓ | ✓ | — |
| Kurumsal logo (tenant) | ✓ (G4) | kısmi | ✓ | — |
| Geri al (undo send) | ✓ (5s) | ✓ | ✓ | — |
| Harici istemci (Thunderbird) | IMAP | ✓ | ✓ | Dokümantasyon |

---

## 3. Canlı doğrulama

| Kontrol | Aksiyon |
|--------|--------|
| **Güvenli değil** (HTTP) | `https://posta.lerta.com.tr/mail` kullanın; `bash scripts/verify-posta-https.sh` |
| Eski UI | Sidebar **Sürüm** SHA; hard refresh / PWA yeniden aç |
| Push yok (iOS) | [MAIL_WEB_PUSH_IOS.md](./MAIL_WEB_PUSH_IOS.md) — Ana ekrana ekle |

---

## 4. Strateji

Lerta Mail **tam Gmail klonu** olmayacak; hedef: **Türkiye KOBİ + pilot** için güvenilir, sade, IMAP uyumlu kutu. Rekabet avantajı: **aynı ekosistem** (yonetim DNS, kota, KVKK) — bunları webmail içinde **görünür** yapmak (durum, kota, konsol linki).

Uygulama fazları: [MAIL_WEBMAIL_UX_ROADMAP.md](./MAIL_WEBMAIL_UX_ROADMAP.md)
