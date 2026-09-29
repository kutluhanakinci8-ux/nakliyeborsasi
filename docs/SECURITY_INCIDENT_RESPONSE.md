# Olay müdahale (incident response)

**Sahip:** Platform operasyon · **Güncelleme:** MP-9 (2026-09)

## 1. Kapsam

- API / web / posta kesintisi, veri sızıntısı şüphesi, KVKK ihlali iddiası
- Mesajlaşma: SSE kopması, WhatsApp köprü teslim hatası, push anahtar sızıntısı
- E-posta: outbox birikimi, ESP (Postmark) reddi, IMAP/Dovecot erişim anomalisi

## 2. Önem dereceleri

| Seviye | Örnek | İlk yanıt | Müşteri bildirimi |
|--------|--------|-----------|-------------------|
| **P1** | Aktif veri sızıntısı, tam mesaj kaybı | **15 dk** | 24 saat içinde özet |
| **P2** | Kısmi kesinti, köprü % hata | **1 saat** | İş günü içinde |
| **P3** | Tek tenant, tek özellik | **4 saat** | Talep halinde |
| **P4** | Dokümantasyon / düşük risk | Backlog | Gerekmez |

## 3. İlk 30 dakika (checklist)

1. `bash scripts/vps-operator-verify.sh` (veya `verify-communications-ops-snapshot.sh`)
2. `GET /health/live`, `GET /health/ready`, `GET /messaging/status`
3. Operatör JWT ile `GET /platform-admin/communications-ops/snapshot`
4. PM2: `nakliyeborsasi-api`, `nakliyeborsasi-web`, posta süreçleri — log `pm2 logs --lines 100`
5. WA köprü: yapılandırılmış log `whatsapp_bridge_delivery_failed` (JSON satırı)
6. Olay kaydı aç (ticket): başlangıç zamanı, etkilenen tenant’lar, kök neden hipotezi

## 4. Eskalasyon

| Rol | Sorumluluk |
|-----|------------|
| On-call operatör | İlk müdahale, smoke, rollback kararı |
| Ürün / teknik lider | P1/P2 müşteri metni, KVKK veri sorumlusu koordinasyonu |
| Hukuk (dış) | Kişisel veri ihlali bildirimi (6698) — **72 saat** değerlendirme penceresi |

## 5. İyileştirme

Her P1/P2 sonrası: kök neden notu, `SECURITY_QUARTERLY_CHECKLIST.md` maddesine aksiyon ekle.
