# Denetim kaydı — saklama ve export SLA

## 1. Denetim kapsamı

| Olay | Kaynak | Operatör erişimi |
|------|--------|------------------|
| Platform admin işlemleri | Uygulama audit tabloları / log | JWT `platform-admin` |
| E-posta gönderim / engagement | Outbox + engagement servisi | `verify-mail-deliverability-mp6.sh` |
| Mesajlaşma export | `GET /platform-admin/messaging/export` | ZIP, KVKK uyumlu paket |
| WA köprü teslim hataları | Yapılandırılmış JSON log | `grep whatsapp_bridge_delivery_failed` |

## 2. Saklama

| Kayıt tipi | Minimum saklama | Maksimum (öneri) |
|------------|-----------------|------------------|
| Güvenlik / admin audit | **13 ay** | 24 ay |
| E-posta engagement ham olay | **90 gün** agregasyon | Ham 13 ay (disk) |
| Uygulama stdout (PM2) | **90 gün** | — |

Rotasyon: operatör `logrotate` + DB partition bakımı (aylık).

## 3. Müşteri export SLA (kurumsal)

| Talep | Hedef süre | Format |
|-------|------------|--------|
| Mesajlaşma eDiscovery | **5 iş günü** | ZIP (API veya operatör) |
| E-posta mailbox export | **5 iş günü** | MBOX / IMAP dump prosedürü |
| Engagement CSV (org filtreli) | **2 iş günü** | `platform-admin` engagement export |

Doğrulama (JWT varsa): `bash scripts/verify-mail-deliverability-mp6.sh`

## 4. DR ve yedek

DR tatbikat kanıtı: `/var/log/lerta-mail-dr-drill.json` — `bash scripts/verify-dr-drill-evidence.sh`  
Detay: [MAIL_BACKUP_DISASTER_RECOVERY.md](./MAIL_BACKUP_DISASTER_RECOVERY.md)
