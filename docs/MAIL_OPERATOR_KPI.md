# Lerta Mail — operatör KPI kartı

## API

`GET /api/v1/platform-admin/mail/kpi`  
Yetki: platform admin JWT.

Yanıt alanları:

| Blok | Metrikler |
|------|-----------|
| `tenants` | toplam, askıda, doğrulanmış özel domain, ücretli plan, 7g outbound aktif |
| `domains` | özel domain sayısı, doğrulanan, doğrulama % |
| `outbox` | pending, failed, son 24s gönderim |
| `billing` | active, grace, past_due, trialing |
| `suppressions` | bounce toplam, son 7 gün eklenen |

`summaryTr` — tek satır özet (konsol kartı).

Konsol: **Operatör** sayfası üstünde «Ürün KPI (özet)».

İlgili: [LERTA_MAIL_PRODUCT_ROADMAP.md](./LERTA_MAIL_PRODUCT_ROADMAP.md) KPI bölümü, [MAIL_PLATFORM_MONITORING.md](./MAIL_PLATFORM_MONITORING.md).
