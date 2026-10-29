# LTR — Dış bağımlılık ve “kendi yolumuz” envanteri

**Amaç:** LTR Viewer/Author/Format geliştirirken hangi sertifika, lisans, araç ve hizmetler **zorunlu dış**, hangileri **tamamen Lerta içi** net olsun.  
**Prensip:** WinRAR / WinZip / 7-Zip **kullanılmaz**; sıkıştırma gerekirse **açık ZIP (DEFLATE)** veya **mühürlü tek HTML** (sıkıştırmasız).

**İlgili:** [LTR_ECOSYSTEM_MASTER_PLAN.md](./LTR_ECOSYSTEM_MASTER_PLAN.md)

---

## 1. Özet tablo (LTR özel)

| # | Kalem | Dış zorunlu? | Kendi yolumuz | Faz |
|---|--------|--------------|---------------|-----|
| 1 | `.ltr` format + renderer | Hayır | `@nakliyeborsasi/core/ltr` | F0–F1 |
| 2 | Web viewer | Hayır | `/ltr/viewer`, ileride PWA | F1 |
| 3 | Mobil istemci | Kısmen | RN/Expo + **kendi WebView shell**; mağaza kuralları dış | F3–F5 |
| 4 | Masaüstü viewer | Kısmen | Electron/Tauri **kendi build**; imza dış CA | F5 |
| 5 | TLS (HTTPS) | Evet* | *Let’s Encrypt veya **TR CA satın alma** — private CA tarayıcıda güvenilmez | F1 |
| 6 | Windows kod imzası | Evet (mağaza dışı da önerilir) | Authenticode sertifikası **CA’dan**; self-sign sadece iç test | F5 |
| 7 | Apple Developer + notarization | Evet | Hesap Apple’da; build pipeline **kendi CI** | F1 test / F5 |
| 8 | Google Play Console | Evet | Hesap Google’da; **kendi AAB** upload | F1 test / F5 |
| 9 | Android imzalama anahtarı | Hayır | **Kendi keystore** (`keytool`, HSM opsiyonel) | F1 |
| 10 | iOS imzalama | Evet (Apple PKI) | Sertifikalar Apple Developer portal | F1 |
| 11 | WinRAR / WinZip | **Kullanılmaz** | ZIP: Node `zlib` / `fflate` (MIT) | — |
| 12 | PDF motoru (export) | Hayır (v1) | Tarayıcı **yazdır → PDF**; sunucu render F2+ opsiyonel | F1 |
| 13 | Adobe Acrobat | **Kullanılmaz** | LTR birincil; PDF yalnızca export | — |
| 14 | DocSend / Gamma | **Kullanılmaz** | Linked mod **kendi API** | F4 |
| 15 | Hosted linked belge | Hayır | `apps/api/modules/ltr` + TR VPS/S3 uyumlu | F4 |
| 16 | MIME kaydı | Evet (standart) | IANA başvurusu; format **bizim spec** | F6 |
| 17 | e-İmza (5070) | Evet (hukuk) | Entegrasyon F5+; **E-Güven / Kamu SM** vb. API | F5–F6 |
| 18 | Fontlar | Hayır | `system-ui` + gömülü **OFL lisanslı** font (seçilirse) | F1 |
| 19 | Antivirüs tarama | Opsiyonel dış | ClamAV **kendi sunucu** (posta ile ortak) | F2 |
| 20 | OSS npm paketleri | Lisans evet, SaaS hayır | SBOM: `npm run oss:sbom` | Sürekli |

---

## 2. Sertifikalar (detay)

### 2.1 TLS / HTTPS

| Kullanım | Öneri | Kendi mi? |
|----------|--------|-----------|
| `www.lerta.com.tr`, `view.lerta.com.tr` | Let’s Encrypt veya TR ticari CA | Sertifika **dış CA**; private key **bizde** (VPS) |
| `mail.lerta.com.tr` (IMAP) | Mevcut LE / kurumsal | Aynı |
| Pinning / mTLS (opsiyonel) | Kendi internal CA | Sadece mobil→API, **public web değil** |

**Kullanılmaz:** Cloudflare SSL “full” dışında tüm trafiği üçüncü tarafa açmak (politikaya göre).

### 2.2 Uygulama kod imzalama

| Platform | Ne gerekir | Not |
|----------|------------|-----|
| **Windows** (.exe/.msi) | Authenticode (EV/OV) | Self-signed → SmartScreen uyarısı |
| **macOS** | Developer ID Application + **notarization** | Apple API |
| **Android** | Upload key + App signing (Play) | Keystore **biz üretiriz** |
| **iOS** | Distribution cert + provisioning | Apple Developer Program |

### 2.3 Belge / mesaj güvenliği (LTR içeriği)

| Kalem | LTR sealed | LTR linked |
|-------|------------|------------|
| Ek şifreleme | Opsiyonel AES (F5, **kendi anahtar yönetimi**) | TLS + token |
| S/MIME (posta) | Mevcut Lerta posta | `.ltr` + `smime.p7s` yan yolu |
| e-İmza TR | PDF export üzerinden (F5) | LTR `approval` blok + harici imza API |

---

## 3. Sıkıştırma ve arşiv (WinRAR / WinZip yok)

| İhtiyaç | Çözüm |
|---------|--------|
| Tek dosya dağıtım | **Mühürlü `.ltr`** (HTML) — varsayılan |
| Çok parça (Author asset) | **ZIP (DEFLATE)** — `core` veya `fflate`; uzantı `.ltr` = zip container **v2** (ileride) |
| Sunucu yedek | `tar.gz` / PostgreSQL dump — **açık format** |
| Kullanıcı “sıkıştır” | UI’da **ZIP export**; RAR/7z **yok** |

---

## 4. Yazılım lisansları (satın alma değil — uyum listesi)

LTR ek katmanında beklenen **açık kaynak** (SBOM’a eklenecek):

| Bileşen | Lisans | Rol |
|---------|--------|-----|
| Node.js | MIT | API, build |
| TypeScript | Apache-2.0 | Derleme |
| Next.js / React | MIT | Web viewer, vitrin |
| Expo / React Native | MIT | Mobil |
| Vitest | MIT | Test |
| `zlib` / `fflate` | MIT | ZIP (opsiyonel) |
| WebView (sistem) | Platform | Mobil renderer |

**Ticari lisans satın almayacağımız:** WinRAR, WinZip, Adobe SDK, Aspose, DocSend, Gamma API (hepsi dış ürün — LTR kendi yolu).

**Operatör zaten kullanıyor olabilir (LTR dışı):** Postmark/ESP, Twilio (WA köprü), Stripe — [SECURITY_DATA_PROCESSING_INVENTORY.md](./SECURITY_DATA_PROCESSING_INVENTORY.md).

---

## 5. Mağaza ve kurumsal hesaplar (dış portal, iç süreç bizde)

| Hesap | Maliyet (yaklaşık) | Kimin adına |
|-------|---------------------|-------------|
| Apple Developer Program | ~99 USD/yıl | Lerta şirket |
| Google Play Console | ~25 USD tek sefer | Lerta şirket |
| Microsoft Partner (opsiyonel Store) | Değişken | F6 |
| D-U-N-S / vergi (Apple) | — | Kurumsal kayıt |

Build, metadata, ekran görüntüsü, gizlilik metni: **kendi repo + CI** (`eas.json` / Gradle).

---

## 6. Altyapı — hepsi “kendi yolumuz” (mevcut Lerta)

| Bileşen | Konum |
|---------|--------|
| API + LTR modül (F2+) | TR VPS, NestJS |
| PostgreSQL / Redis | Aynı VPS |
| Object storage (linked LTR) | VPS disk veya **kendi S3 uyumlu** (MinIO self-host) |
| CDN | **Opsiyonel** — önce origin doğrudan |
| İndirmeler / viewer | `apps/web` static + Next |

**Kullanılmaz (LTR için):** Dropbox, Google Drive, Firebase Hosting (politika ile).

---

## 7. Hukuk / uyum metinleri (dış danışman opsiyonel, içerik bizde)

| Belge | Kaynak |
|-------|--------|
| KVKK aydınlatma (LTR Viewer) | `docs/` + web `/kisisel-verilerin-korunmasi` genişletme |
| Mağaza gizlilik politikası | LTR veri toplamaz (sealed); linked mod ayrı madde |
| Kullanım koşulları | `/kullanim-kosullari` LTR eki |
| OSS attributions | `npm run oss:merge-legal` → mobil Legal ekranı |

---

## 8. LTR geliştirme sırası + merge/deploy kapısı

Her faz sonunda: **PR → main merge → `publish:main` / VPS deploy** (mevcut `scripts/agent-merge-deploy-main.sh`).

| Sıra | Faz | Deploy edilen | Yeni dış kalem |
|------|-----|---------------|----------------|
| 1 | F0 | Spec, `/indirmeler`, örnek | Yok |
| 2 | F1a | `/ltr/viewer`, core render | TLS (mevcut) |
| 3 | F1b | Play internal / TestFlight | Apple + Google hesap |
| 4 | F2 | Posta MIME + önizleme | ClamAV (opsiyonel) |
| 5 | F3 | Mesaj LTR ek | — |
| 6 | F4 | Author + linked API | MinIO (self) |
| 7 | F5 | Mağaza prod | Authenticode + notarization sertifikaları |
| 8 | F6 | Global + IANA | MIME başvuru ücreti |

---

## 9. Karar kaydı (sizin “kendi istemcimiz” ilkesi)

1. **Format, renderer, viewer UI, API, şablonlar** → %100 Lerta kodu.  
2. **Sıkıştırma** → mühürlü HTML veya açık ZIP; **WinRAR/WinZip yok**.  
3. **PDF** → yalnızca export hedefi; Adobe lisansı **yok**.  
4. **Mağaza + public TLS + (Windows/macOS) kod imza CA** → dış dünya zorunluluğu; anahtarlar ve build **bizde**.  
5. **e-İmza** → hukuken yetkili sağlayıcı API (F5); LTR içi yalnızca hook.  
6. **OSS** → ücretsiz lisanslar; SBOM ile Lisanslar ekranında gösterim.

Bu envanter onaylandıktan sonra **F1a merge/deploy** ile devam edilir.
