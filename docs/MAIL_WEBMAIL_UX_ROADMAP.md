# Lerta Posta — UX yol haritası (Faz G)

**Uygulama:** `apps/mail-web` · **API:** `company/mail-inbox`, compose, drafts.

| Faz | Odak | Süre (teknik) | Kabul |
|-----|------|----------------|-------|
| **G0** | HTTPS / güven | Ops | HSTS + HTTP→HTTPS; middleware; `verify-posta-https.sh` PASS |
| **G1** | Boş durum, keşfedilebilirlik | Küçük kod | İpuçlu empty state; sidebar kaydırma; thread toggle görünür |
| **G2** | Üretkenlik | Orta | Yenile; okundu/okunmadı; toplu seç + arşiv/çöp; kısayol `?` |
| **G3** | İletme & adresleme | Orta | İlet API+UI; BCC; “Tümüne yanıtla” |
| **G4** | Görünüm & marka | Orta | Karanlık tema; tenant logo; compose iyileştirme (markdown veya RTE) |
| **G5** | Güç kullanıcı | Büyük | Yıldız (uygulandı); özel klasör; sunucu kuralları (Sieve benzeri) |
| **G6** | Bildirim & offline | Büyük | Web push; service worker cache (D7 ile hizalı) |

---

## G0 — HTTPS (P0, ekran görüntüsü)

```bash
bash scripts/verify-posta-https.sh
# FAIL ise VPS:
sudo bash scripts/nginx-posta-lerta-com-tr.sh
sudo certbot certonly --webroot -w /var/www/certbot -d posta.lerta.com.tr
```

---

## G1 — Bu sprint (kod)

- [x] `MailEmptyState` — liste ve okuma paneli
- [x] Sidebar `overflow-y: auto` — tüm klasörler görünsün
- [x] Konuşma toggle üst araç çubuğunda
- [x] Benchmark + bu doküman

---

## G2 — Üretkenlik (uygulandı)

- API: `POST messages/bulk/read|unread|folder`, `PATCH messages/:id/unread`
- UI: toplu seçim, okundu/okunmadı, arşiv/çöp, yenile, `?` kısayol yardımı
- Klavye: `c` `r` `/` `e` `#` `u` `?` `Esc`

## G2+ — İyileştirme (planlı)

- Shift+tık aralık seçimi, `j`/`k` liste gezintisi

---

## G3 — İletme & BCC (uygulandı)

- API: `POST messages/:id/forward`, compose `cc`/`bcc`, reply `bcc`
- UI: **İlet** + `f` kısayolu; yaz ekranında Cc/Bcc; yanıtta Bcc

---

## G4 — Marka & tema (uygulandı)

- `GET company/mail-inbox/branding` → Enterprise logo / başlık
- Koyu/açık tema (☾/☀ FAB)
- Zengin yazım + API `html`

---

## G5 — Yıldızlı (kısmi, uygulandı)

- API: `starredAt`, `folder=starred`, `PATCH messages/:id/star`
- UI: **Yıldızlı** klasörü; liste/okuma ☆/★; klavye `s`
## G5 — Özel klasörler (uygulandı)

- API: `custom-folders` CRUD, `customFolderId` on messages, bulk taşıma
- Gelen kutusu = klasörsüz; özel klasörler sidebar’da

## G5 — Gelen kuralları (MVP, uygulandı)

- `mail_inbox_rule`: gönderen/konu içerir → yıldız ve/veya özel klasör
- Inbound ingest sırasında ilk eşleşen kural uygulanır
- Webmail: Ayarlar → **Kurallar**

## G5+ — Üretkenlik (uygulandı)

- API: `POST messages/bulk/star` `{ messageIds, starred }`
- UI: toplu **Yıldızla** / **Yıldız kaldır**; `j`/`k` liste gezintisi; Shift+tık aralık seçimi

## G6 — Offline & push (kısmi, uygulandı)

- Service worker: statik önbellek, `/offline.html` gezinme yedek
- Web Push: VAPID, abonelik API, inbound bildirimi, Ayarlar → Bildirim
- Ses, sekme/PWA okunmamış rozeti, günlük özet e-postası (08:00)
- Geri al gönder: yeni posta, yanıt, iletme, taslak (5 sn)
- Snooze: klasör sayacı, `z` kısayolu, süre bitince web push

## G7 — Dokümantasyon & toplu erteleme (uygulandı)

- [MAIL_WEB_PUSH_IOS.md](./MAIL_WEB_PUSH_IOS.md) — iOS PWA push rehberi
- API: `POST messages/bulk/snooze` `{ messageIds, snoozedUntil }`
- UI: toplu seçim → **Ertele…** (1 sa / 3 sa / 1 gün / 1 hafta)
- Benchmark güncellemesi (HTTPS, G2–G6 özellikleri)

## G8 — Harici istemci & bildirim keşfi (uygulandı)

- [MAIL_THUNDERBIRD_IMAP.md](./MAIL_THUNDERBIRD_IMAP.md) + web `/help/imap`
- Ayarlar → IMAP: rehber linki, sunucu/kullanıcı **Kopyala**
- Ayarlar → Bildirim: iOS Ana ekrana ekle uyarısı
- [MAIL_CALDAV_D6.md](./MAIL_CALDAV_D6.md) — D6 plan notu (uygulama sonra)

## D6 — Takvim & kişiler (MVP, uygulandı)

- Org takvimi + kişi defteri; webmail **Takvim** / **Kişiler**
- iCal `.ics` içe/dışa; vCard `.vcf` dışa
- Detay: [MAIL_CALDAV_D6.md](./MAIL_CALDAV_D6.md)

## G5 — Kurallar v2 (uygulandı)

- Okundu işaretle ve çöpe taşı işlemleri

---

## Deploy kontrol listesi (her UX sprint)

1. `npm run build -w @nakliyeborsasi/mail-web` (veya monorepo script)
2. PM2 `lerta-mail-web` restart
3. `verify-posta-https.sh` + manuel `/mail` smoke
4. Mobil: 390px genişlik — 3 panel geçişi
