# Bağlı Hesaplar Premium (CAP) — yol haritası

**Hedef:** Lerta `info@`, Microsoft (Graph) ve Gmail (API) hesaplarını **birleşik gelen kutusunda** göstermek; **yanıt / ilet / yeni mail** dahil bağlı hesaptan gönderim.

| Faz | Kod | Durum |
|-----|-----|--------|
| Temel + faturalama | CAP-0 | `mail_connected_inbox_entitlement`, `GET .../connected-accounts` |
| Birleşik liste + filtre | CAP-1 | `connectedSource` + rozetler |
| Microsoft tam okuma | CAP-2 | ✅ 6 klasör delta, conversationId, Graph ek/okundu |
| Gmail okuma | CAP-3 | ✅ Kod: OAuth, senkron, UI (Console anahtarı sonra) |
| Birleşik gönderim | CAP-4 | ✅ Kod: Graph + Gmail send, otomatik yanıt kaynağı |
| Push | CAP-5 | ✅ Stub: `public/mail-connected/*` + Gmail watch hazır |
| Üretkenlik | CAP-6 | ✅ Birleşik taslaklar, `scheduleAt`, zamanlanmış liste |
| Arama + AI | CAP-7 | ✅ body arama + `deep=1` Graph/Gmail canlı hit |
| GA | CAP-8 | ✅ Bağlı hesap denetim API + smoke script |

SQL: `scripts/sql/mail-connected-accounts-cap0.sql`  
Uygulama: `scripts/apply-mail-connected-accounts-cap0-schema.sh`
