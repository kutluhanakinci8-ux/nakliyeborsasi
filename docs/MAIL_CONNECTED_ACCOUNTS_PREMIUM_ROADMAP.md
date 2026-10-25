# Bağlı Hesaplar Premium (CAP) — yol haritası

**Hedef:** Lerta `info@`, Microsoft (Graph) ve Gmail (API) hesaplarını **birleşik gelen kutusunda** göstermek; **yanıt / ilet / yeni mail** dahil bağlı hesaptan gönderim.

| Faz | Kod | Durum |
|-----|-----|--------|
| Temel + faturalama | CAP-0 | `mail_connected_inbox_entitlement`, `GET .../connected-accounts` |
| Birleşik liste + filtre | CAP-1 | `connectedSource` + rozetler |
| Microsoft tam okuma | CAP-2 | Klasörler, thread, ekler |
| Gmail okuma | CAP-3 | Gmail API OAuth + senkron |
| Birleşik gönderim | CAP-4 | Graph + Gmail send |
| Push | CAP-5 | Webhook / Pub/Sub |
| Üretkenlik | CAP-6 | Taslak, snooze, zamanlanmış |
| Arama + AI | CAP-7 | Tüm hesaplar |
| GA | CAP-8 | Denetim, pilot |

SQL: `scripts/sql/mail-connected-accounts-cap0.sql`  
Uygulama: `scripts/apply-mail-connected-accounts-cap0-schema.sh`
