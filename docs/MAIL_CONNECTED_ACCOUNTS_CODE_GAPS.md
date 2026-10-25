# Bağlı hesaplar — kod eksikleri (OAuth öncesi)

Bu liste **bağlantı kurulmadan** tamamlanan kod iyileştirmelerini izler.

| Alan | Durum |
|------|--------|
| Gmail `threadId` + yanıt threading | `gmail_thread_id`, MIME In-Reply-To |
| Graph yanıt | `/messages/{id}/reply` + entitlement yeni hesap |
| Gmail history delta | `history.list` messageAdded |
| Dış arama içe aktarma | `POST .../connected-accounts/import-message` |
| Push (CAP-5) | Pub/Sub + Graph validation → senkron tetikleme |
| Zamanlama UI | `scheduleAt` compose API + Ayarlar paneli |
| Dış arama UI | Bulut hit listesi + aç / içe aktar |

OAuth / Console sonrası: `GOOGLE_GMAIL_*`, `MICROSOFT_GRAPH_*`, isteğe bağlı `GOOGLE_GMAIL_PUBSUB_TOPIC`, `MICROSOFT_GRAPH_MAIL_WEBHOOK_URL`.
