# Lerta Posta — rakip karşılaştırma (webmail)

**Kapsam:** `posta.lerta.com.tr` (`apps/mail-web`) — günlük kullanım vs Gmail, Outlook Web, Zoho Mail, Proton Mail.  
**Referans ekran:** 3 sütun (sol menü · liste · okuma), pilot `kullanici.lerta.com.tr` kutusu.

---

## 1. Özet skor (webmail UX, 0–100)

| Boyut | Ağırlık | Lerta (bugün) | Gmail | Outlook | Not |
|-------|---------|---------------|-------|---------|-----|
| Güven & TLS | 12% | **40**† | 98 | 98 | †Canlıda “Güvenli değil” = sertifika/HTTPS eksik |
| Temel kutu (okuma/yazma) | 20% | **72** | 95 | 94 | Klasörler, ek, taslak, arama filtreleri var |
| Üretkenlik (toplu, kısayol) | 15% | **62** | 92 | 90 | G2 toplu + kısayollar; G5 yıldız; snooze yok |
| Konuşma & iletme | 10% | **72** | 95 | 93 | Thread + **İlet** (G3); tümüne yanıt (Cc meta yok) kısıtlı |
| Yazma deneyimi | 12% | **68** | 90 | 88 | Cc/Bcc + basit zengin HTML; tam WYSIWYG değil |
| Mobil / PWA | 10% | **60** | 85 | 82 | Paneller var; native push yok |
| Kurumsal (marka, alias) | 8% | **62** | 70 | 75 | G4: Enterprise logo/başlık webmailde |
| Entegrasyon (IMAP, takvim) | 8% | **50** | 90 | 92 | IMAP paneli var; CalDAV/kişi yok |
| Akıllı özellikler | 5% | **15** | 80 | 75 | Kural, öncelik, AI özet yok |

**Ağırlıklı Lerta skoru ≈ 52/100** — KOBİ pilot için **yeterli MVP**; Gmail/Outlook ile **görünüm + üretkenlik + güven** açığı belirgin.

---

## 2. Özellik matrisi (detay)

| Özellik | Lerta | Gmail | Outlook | Öncelik |
|---------|-------|-------|---------|---------|
| HTTPS + geçerli sertifika | ⚠️ VPS | ✓ | ✓ | **P0** |
| Gelen / gönderilen / spam / taslak | ✓ | ✓ | ✓ | — |
| Arşiv / çöp | ✓ (kod) | ✓ | ✓ | Deploy doğrula |
| Konuşma görünümü | ✓ (checkbox) | ✓ varsayılan | ✓ | Görünürlük UX |
| Gelişmiş arama | ✓ | ✓ | ✓ | — |
| Yanıtla | ✓ | ✓ | ✓ | — |
| İlet (forward) | ✗ | ✓ | ✓ | **G3** |
| BCC alanı | ✗ | ✓ | ✓ | G3 |
| Zengin metin compose | ✗ | ✓ | ✓ | G4 |
| Toplu seç + sil/arşiv | ✗ | ✓ | ✓ | G2 |
| Okundu / okunmadı işaretle | kısmi | ✓ | ✓ | G2 |
| Yıldız / bayrak | ✓ (G5) | ✓ | ✓ | — |
| Klavye kısayolları (j/k, c, r) | ✓ (G5+) | ✓ | ✓ | — |
| Depolama kotası çubuğu | ✓ | ✓ | ✓ | — |
| İmza / şablon | ✓ | ✓ | ✓ | — |
| IMAP / şifre döndürme | ✓ | ✓ | ✓ | — |
| TOTP (webmail) | ✓ ayarlar | ✓ | ✓ | — |
| Özel klasör / etiket | ✗ | ✓ | ✓ | G5 |
| Kurallar / filtre | ✗ | ✓ | ✓ | G5 |
| Takvim / kişiler | ✗ | ✓ | ✓ | D6 |
| Push / ses bildirimi | ✗ | ✓ | ✓ | D7 |
| Karanlık tema | ✗ | ✓ | ✓ | G4 |
| Kurumsal logo (tenant) | ✗ | kısmi | ✓ | G4 |
| Geri al (undo send) | ✗ | ✓ | ✓ | G5 |
| Harici istemci (Thunderbird) | IMAP | ✓ | ✓ | Dokümantasyon |

---

## 3. Ekranınızdan tespitler

| Gözlem | Anlam | Aksiyon |
|--------|--------|---------|
| **Güvenli değil** | TLS yok veya self-signed / yanlış host | `verify-posta-https.sh`, certbot |
| Sadece “Mesaj yok” | Zayıf boş durum | **G1** ipuçları + ilk posta rehberi |
| Arşiv/çöp görünmüyor (eski build?) | Sidebar kesilmiş veya eski deploy | `git pull` + mail-web build |
| “IMAP ayarları” metni | Eski UI; kodda **Ayarlar** | Deploy güncelle |
| Konuşma görünümü gizli | Checkbox arama altında | G1: toolbar’da toggle |

---

## 4. Strateji

Lerta Mail **tam Gmail klonu** olmayacak; hedef: **Türkiye KOBİ + pilot** için güvenilir, sade, IMAP uyumlu kutu. Rekabet avantajı: **aynı ekosistem** (yonetim DNS, kota, KVKK) — bunları webmail içinde **görünür** yapmak (durum, kota, konsol linki).

Uygulama fazları: [MAIL_WEBMAIL_UX_ROADMAP.md](./MAIL_WEBMAIL_UX_ROADMAP.md)
