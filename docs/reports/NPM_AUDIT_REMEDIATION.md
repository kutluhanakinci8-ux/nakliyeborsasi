# npm audit — kritik kalemler ve plan

**Son koşu:** 4 critical, 12 high (çoğu `@nestjs/cli` → `webpack` transitive).

## Uygulanan (2026-10-24)

- `@simplewebauthn/server` **14.0.3** (API), browser **13** (mail-web)
- Lerta Posta / konsol / marketing: **Next 15.5.28**
- `apps/web` (TMS): Next **14.2.35** — App Router `params` async migrasyonu sonrası 15.5.28

## Kalan

1. **TMS web** Next 15 migrasyonu (`PageProps` async params)
2. **Nest 11/12** + `multer`/`body-parser` high
3. **bcrypt → tar@6** (native prebuild); risk kaydı veya `bcryptjs` değerlendirmesi
4. **Çeyreklik CI:** `SKIP_NPM_AUDIT=0 bash scripts/verify-security-compliance-mp9.sh`

```bash
npm audit --json > docs/reports/npm-audit-$(date +%F).json
```
