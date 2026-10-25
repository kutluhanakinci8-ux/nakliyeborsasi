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
| Graph push aboneliği | Senkron sonrası `/subscriptions` (varsayılan webhook URL) |
| Lerta taslak → Graph/Gmail | `connectedSend*` + `provider_draft_id` |
| Çöp kutusu / kalıcı silme senkronu | Graph trash + Gmail trash/untrash/delete |
| Graph çöp → gelen kutusu | `/messages/{id}/move` → `inbox` |
| Arşiv senkronu (tekil + toplu) | Graph move `archive` + Gmail `INBOX` etiketi |
| Çöp kutusunu boşalt | `purgeAllTrash` → sağlayıcı kalıcı silme |
| Ayarlar CAP özeti | `MailConnectedInboxStatusPanel` + status API |
| Taslak gönderim Kimden | `getForSend` + UI `composeSendAsKey` geri yükleme |
| Bağlı kutu durumu API | `GET .../connected-inbox/status` (özellik bayrakları) |
| P0 ön-bağlantı | Graph `permanentDelete`, bağlı ekler, push secret, import klasör |

OAuth / Console sonrası: `GOOGLE_GMAIL_*`, `MICROSOFT_GRAPH_*`, isteğe bağlı `GOOGLE_GMAIL_PUBSUB_TOPIC`, `MICROSOFT_GRAPH_MAIL_WEBHOOK_URL` (boşsa `posta.lerta.com.tr/api/v1/public/mail-connected/microsoft/graph`).

Doğrulama: `scripts/verify-connected-inbox-cap8.sh` (public push uçları); tam API için canlı JWT ile `connected-inbox/status` ve senkron akışları.
