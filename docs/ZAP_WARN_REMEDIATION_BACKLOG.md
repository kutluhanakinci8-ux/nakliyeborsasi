# ZAP baseline — WARN backlog (Faz 7)

Kaynak: `docs/reports/ZAP_PASSIVE_*_posta.lerta.com.tr_login_.json` (25.10.2026). **FAIL-NEW: 0.**

| ZAP | Konu | Öncelik | Aksiyon |
|-----|------|---------|---------|
| 10063 | Permissions-Policy eksik | P2 | nginx/Next `Permissions-Policy` (posta + yonetim) |
| 90004 | COEP geçersiz/eksik | P3 | COEP yalnızca izole origin gerektirir; posta için genelde **bilinçli skip** veya COOP+CORP değerlendirmesi |
| 10049 | Non-Storable Content | P3 | API/login için cache politikası bilinçli; statik `_next` CDN cache |
| 10109 | Modern Web Application (SPA) | Bilgi | Bilgi amaçlı |
| 404 | `robots.txt` / `sitemap.xml` | P2 | `apps/mail-web/public/robots.txt` (repo) + deploy |

OWASP surrogate: `scripts/qa-owasp-baseline.sh` (sürekli).

Tam pentest: `docs/PENTEST_EXTERNAL_CHECKLIST.md`.
