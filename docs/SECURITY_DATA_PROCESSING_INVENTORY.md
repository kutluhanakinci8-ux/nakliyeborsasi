# Veri işleme envanteri (KVKK — özet)

**Veri sorumlusu:** Müşteri organizasyonu (tenant) · **Veri işleyen:** Lerta platformu (barındırma ve işleme)

## 1. Veri kategorileri

| Kategori | Örnek alanlar | Amaç | Hukuki dayanak (özet) |
|----------|---------------|------|------------------------|
| Kimlik / hesap | e-posta, ad, rol, `companyId` | Oturum, yetkilendirme | Sözleşme, meşru menfaat |
| Firma sohbeti | thread, mesaj metni, ek metadata | B2B müzakere, ihale bağlamı | Sözleşme |
| Kurumsal posta | mailbox, IMAP kopyası, outbox | İş iletişimi | Sözleşme |
| Teknik log | IP, `userAgent`, SSE instance | Güvenlik, SLO | Meşru menfaat |
| Bildirim | push abonelik, WA köprü telefon (onaylı) | Teslim bildirimi | Açık rıza (KVKK metni) |
| ESP olayları | bounce, open (varsa) | Deliverability | Meşru menfaat |

## 2. Saklama (varsayılan operatör politikası)

| Veri | Saklama | Silme |
|------|---------|--------|
| Mesaj / thread | Sözleşme süresi + **24 ay** arşiv | Tenant talebi + platform admin erasure akışı |
| E-posta mailbox | Müşteri IMAP politikası | `MAIL_BACKUP_DISASTER_RECOVERY.md` — E3 erasure |
| Audit / admin export | **13 ay** | Otomatik rotasyon (DB/partition — operatör) |
| Uygulama log (PM2) | **90 gün** | Sunucu rotasyonu |

## 3. Alt işleyenler (sub-processors)

| Sağlayıcı | Veri | Bölge | Not |
|-----------|------|-------|-----|
| Barındırma (VPS) | Tüm uygulama verisi | TR/EU (sözleşmeye göre) | `VPS_OPERATOR_COMMANDS.md` |
| PostgreSQL | İlişkisel veri | Aynı VPS / yedek | Şifreli disk önerilir |
| Postmark (veya ESP) | Giden e-posta içeriği | US/EU | DPA / SCC müşteri paketinde |
| Meta / WhatsApp (köprü) | Telefon, bildirim metni | Global | Sadece opt-in köprü; tam WA içeriği saklanmaz |

## 4. Veri sahibi hakları

- **Erişim / düzeltme:** Hesap ayarları + destek
- **Export:** `GET /platform-admin/messaging/export` (ZIP, operatör JWT) — [LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md](./LERTA_MAIL_MESSAGING_PARITY_100_ROADMAP.md)
- **Silme:** Platform admin erasure prosedürü — yedekten geri yükleme politikası `MAIL_BACKUP_DISASTER_RECOVERY.md`

## 5. AI / LLM (feature flag)

`MESSAGING_SUMMARY_LLM` vb. açıksa: org opt-in ve KVKK bilgilendirme metni zorunlu — [FIRMA_SOHBETI_COMPETITIVE_ROADMAP.md](./FIRMA_SOHBETI_COMPETITIVE_ROADMAP.md).
