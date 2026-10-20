# Lerta Mail — parite fazları 20–28 (öncelik tablosu)

| Faz | Öncelik | Konu | Doküman |
|-----|---------|------|---------|
| 20 | P0 | Inbound DNS/VPS doğrulama | `LERTA_MAIL_PARITY_FAZ20_P0_INBOUND.md` |
| 21 | P0 | Billing test→canlı cutover | `LERTA_MAIL_PARITY_FAZ21_P0_BILLING.md` |
| 22 | P1 | Kampanya open/click + webhook | `LERTA_MAIL_PARITY_FAZ22_P1_ENGAGEMENT.md` |
| 23 | P1 | Kampanya grafik paneli | `LERTA_MAIL_PARITY_FAZ23_P1_CHARTS.md` |
| 24 | P1 | Vitrin ↔ posta URL tutarlılığı | `LERTA_MAIL_PARITY_FAZ24_P1_VITRIN.md` |
| 25 | P2 | HTML bilgi kutusu bloğu | `LERTA_MAIL_PARITY_FAZ25_P2_BLOCKS.md` |
| 26 | P2 | Kampanya `draft` | `LERTA_MAIL_PARITY_FAZ26_P2_DRAFT.md` |
| 27 | P2 | Postmaster / itibar UI | `LERTA_MAIL_PARITY_FAZ27_P2_POSTMASTER.md` |
| 28 | P3 | PWA offline shell v8 | `LERTA_MAIL_PARITY_FAZ28_P3_OFFLINE.md` |

Deploy: her merge sonrası `main` → `bash scripts/deploy-vps-ssh.sh` (VPS_SSH_*). Checklist: `bash scripts/run-lerta-mail-vps-deploy-checklist.sh`.
