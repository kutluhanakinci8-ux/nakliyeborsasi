# DMARC aggregate (rua) — E2

## Tenant görünümü

- Konsol: `/dmarc`
- API: `GET /api/v1/company/mail-identity/dmarc?days=30`

## Operatör ingest

`POST /api/v1/platform-admin/mail/dmarc/ingest` (platform admin JWT)

### XML (aggregate rapor gövdesi)

```json
{
  "organizationId": "uuid-opsiyonel",
  "xml": "<feedback>...</feedback>"
}
```

`organizationId` verilmezse domain `mail_domains` tablosundan çözülür.

### Manuel özet (test / yedek)

```json
{
  "organizationId": "uuid",
  "summary": {
    "domain": "musteri.com",
    "periodStart": "2026-09-01T00:00:00.000Z",
    "periodEnd": "2026-09-02T00:00:00.000Z",
    "messageCount": 120,
    "disposition": { "none": 110, "quarantine": 5, "reject": 5 },
    "dkim": { "pass": 100, "fail": 20 },
    "spf": { "pass": 115, "fail": 5 },
    "reporterOrgName": "google.com"
  }
}
```

## Veri modeli

Tablo: `mail_dmarc_aggregate` — dönem + domain + disposition / DKIM / SPF sayıları.

Prod: `TYPEORM_SYNCHRONIZE` veya migration.
