# Lerta Posta — UX yol haritası (Faz G)

**Uygulama:** `apps/mail-web` · **API:** `company/mail-inbox`, compose, drafts.

| Faz | Odak | Süre (teknik) | Kabul |
|-----|------|----------------|-------|
| **G0** | HTTPS / güven | Ops | `verify-posta-https.sh` PASS; tarayıcı kilit |
| **G1** | Boş durum, keşfedilebilirlik | Küçük kod | İpuçlu empty state; sidebar kaydırma; thread toggle görünür |
| **G2** | Üretkenlik | Orta | Yenile; okundu/okunmadı; toplu seç + arşiv/çöp; kısayol `?` |
| **G3** | İletme & adresleme | Orta | İlet API+UI; BCC; “Tümüne yanıtla” |
| **G4** | Görünüm & marka | Orta | Karanlık tema; tenant logo; compose iyileştirme (markdown veya RTE) |
| **G5** | Güç kullanıcı | Büyük | Yıldız; özel klasör; sunucu kuralları (Sieve benzeri) |
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

## G4 — Marka & tema

- `GET company/mail-identity/branding` (mevcut) → webmail header
- `prefers-color-scheme` + toggle

---

## G5–G6

Faz D6/D7 ve kurumsal talep ile planlanır; detay `LERTA_MAIL_PRODUCT_ROADMAP.md` Faz D tablosu.

---

## Deploy kontrol listesi (her UX sprint)

1. `npm run build -w @nakliyeborsasi/mail-web` (veya monorepo script)
2. PM2 `lerta-mail-web` restart
3. `verify-posta-https.sh` + manuel `/mail` smoke
4. Mobil: 390px genişlik — 3 panel geçişi
