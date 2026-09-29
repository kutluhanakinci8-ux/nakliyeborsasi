# Güvenlik ve uyumluluk — SOC2-lite özet (MP-9)

**Kapsam:** Kurumsal iletişim (Firma sohbeti + posta + platform admin) — **SOC2 Type II sertifikası değil**; TR KVKK ve kurumsal due diligence için süreç dokümantasyonu.

**İlgili runbook:** [MESSAGING_POSTA_OPS_RUNBOOK.md](./MESSAGING_POSTA_OPS_RUNBOOK.md) (MP-5 gözlemlenebilirlik)

| Doküman | Amaç |
|---------|------|
| [SECURITY_INCIDENT_RESPONSE.md](./SECURITY_INCIDENT_RESPONSE.md) | Olay müdahale, bildirim, eskalasyon |
| [SECURITY_DATA_PROCESSING_INVENTORY.md](./SECURITY_DATA_PROCESSING_INVENTORY.md) | Veri kategorileri, amaç, saklama, alt işleyenler |
| [SECURITY_AUDIT_RETENTION_EXPORT.md](./SECURITY_AUDIT_RETENTION_EXPORT.md) | Denetim kaydı saklama ve müşteri export SLA |
| [SECURITY_QUARTERLY_CHECKLIST.md](./SECURITY_QUARTERLY_CHECKLIST.md) | Bağımlılık taraması, pen-test / DR periyodu |

**Müşteri paketi:** `bash scripts/pack-customer-due-diligence-mp9.sh` → `dist/customer-due-diligence-mp9.zip`

**Doğrulama:** `bash scripts/verify-security-compliance-mp9.sh`
