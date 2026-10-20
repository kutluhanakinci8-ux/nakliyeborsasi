# Parite Faz 22 — P1 open/click (kampanya)

Kampanya alıcılarına giden HTML mesajlarda:

- Open pixel: `GET /api/v1/email/track/open/:token`
- Link redirect: `GET /api/v1/email/track/click/:token`
- Outbox metadata: `marketingCampaignId`

Webhook olayları: `campaign.opened`, `campaign.clicked` (konsol → Entegrasyon aboneliği).

Kampanya detay API `engagement` alanı: tracked gönderim, benzersiz açılma, tıklama toplamları.
